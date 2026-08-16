"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("@job-aggregator-ats/database");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
async function ensureDummyUser() {
    const user = await database_1.prisma.user.findFirst();
    if (!user) {
        await database_1.prisma.user.create({
            data: {
                email: "test@example.com",
                keywords: '["Software Engineer"]',
                locations: '["Remote"]'
            }
        });
    }
}
ensureDummyUser();
// GET /api/user - Fetch preferences
app.get('/api/user', async (req, res) => {
    try {
        const user = await database_1.prisma.user.findFirst();
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});
// PUT /api/user - Update preferences
app.put('/api/user', async (req, res) => {
    try {
        const { keywords, locations } = req.body;
        const user = await database_1.prisma.user.findFirst();
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const updated = await database_1.prisma.user.update({
            where: { id: user.id },
            data: {
                keywords: JSON.stringify(keywords),
                locations: JSON.stringify(locations)
            }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});
// GET /api/jobs - Fetch jobs for the dashboard
app.get('/api/jobs', async (req, res) => {
    try {
        const jobs = await database_1.prisma.job.findMany();
        res.json(jobs);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});
// PATCH /api/jobs/:id/state - Update job status (e.g. moved to "Applied")
app.patch('/api/jobs/:id/state', async (req, res) => {
    const { id } = req.params;
    const { state } = req.body; // e.g., 'APPLIED'
    try {
        const updatedJob = await database_1.prisma.job.update({
            where: { id },
            data: { state },
        });
        res.json(updatedJob);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update job' });
    }
});
// DELETE /api/jobs/:id - Delete a job completely
app.delete('/api/jobs/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await database_1.prisma.job.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete job' });
    }
});
const nodemailer_1 = __importDefault(require("nodemailer"));
// Helper to send email using Ethereal (fake SMTP for testing)
async function sendEmailNotification(jobTitle, company, url, userEmail) {
    try {
        const testAccount = await nodemailer_1.default.createTestAccount();
        const transporter = nodemailer_1.default.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: testAccount.user, // generated ethereal user
                pass: testAccount.pass, // generated ethereal password
            },
        });
        const info = await transporter.sendMail({
            from: '"Nexus ATS" <nexus@ats.local>',
            to: userEmail,
            subject: `New Job Match: ${jobTitle} at ${company}`,
            text: `We found a new job match for you!\n\nTitle: ${jobTitle}\nCompany: ${company}\nLink: ${url}\n\nGood luck!`,
            html: `<b>We found a new job match for you!</b><br><br><b>Title:</b> ${jobTitle}<br><b>Company:</b> ${company}<br><b>Link:</b> <a href="${url}">${url}</a><br><br>Good luck!`,
        });
        console.log(`[EMAIL SENT] Preview URL: %s`, nodemailer_1.default.getTestMessageUrl(info));
    }
    catch (err) {
        console.error("Failed to send email:", err);
    }
}
// POST /api/notify - Triggered by the Scraper worker when a new job is found
app.post('/api/notify', async (req, res) => {
    const { jobTitle, company, url, source } = req.body;
    try {
        const user = await database_1.prisma.user.findFirst();
        if (user) {
            // Check if job exists
            const existing = await database_1.prisma.job.findFirst({
                where: { url }
            });
            if (!existing) {
                await database_1.prisma.job.create({
                    data: {
                        title: jobTitle,
                        company,
                        url,
                        source: source || "Unknown",
                        userId: user.id
                    }
                });
                console.log(`[DB] Saved New Job: ${jobTitle} at ${company}`);
                // Trigger Notifications
                if (user.notifyEmail) {
                    await sendEmailNotification(jobTitle, company, url, user.email);
                }
                if (user.notifySms) {
                    // Mock SMS since Twilio credentials are not provided
                    console.log(`[SMS MOCK SENT] To: ${user.phoneNumber || 'User'} -> "Nexus ATS: New job match for ${jobTitle} at ${company}."`);
                }
            }
        }
        res.status(200).json({ message: 'Notification queued & saved.' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process notification' });
    }
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 API Server running on port ${PORT}`);
});
