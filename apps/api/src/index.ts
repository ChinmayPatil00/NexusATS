import express from 'express';
import { z } from 'zod';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from '@job-aggregator-ats/database';
import { exec } from 'child_process';
import path from 'path';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
const pdfParse = require('pdf-parse');
import rateLimit from 'express-rate-limit';
import { matchResumeToJobsBackground } from './services/aiMatcher';
import winston from 'winston';
import { spawn } from 'child_process';

// Launch scraper in background
const scraperPath = path.resolve(__dirname, '../../../packages/scraper');
const scraperProcess = spawn('npx', ['tsx', 'src/index.ts'], {
  cwd: scraperPath,
  stdio: 'inherit',
  shell: true
});
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// Rate limiter for notify endpoint (max 60 requests per minute)
const notifyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 60,
  message: { error: 'Too many requests from this IP, please try again after a minute' }
});

async function ensureDummyUser() {
  const user = await prisma.user.findFirst();
  if (!user) {
    await prisma.user.create({
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
    const user = await prisma.user.findFirst();
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/user - Update preferences
app.put('/api/user', async (req, res) => {
  try {
    const { keywords, locations, name, githubUrl, linkedinUrl, phoneNumber } = req.body;
    const user = await prisma.user.findFirst();
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Create an update object dynamically since not all fields are always present
    const dataToUpdate: any = {};
    if (keywords !== undefined) dataToUpdate.keywords = JSON.stringify(keywords);
    if (locations !== undefined) dataToUpdate.locations = JSON.stringify(locations);
    if (name !== undefined) dataToUpdate.name = name;
    if (githubUrl !== undefined) dataToUpdate.githubUrl = githubUrl;
    if (linkedinUrl !== undefined) dataToUpdate.linkedinUrl = linkedinUrl;
    if (phoneNumber !== undefined) dataToUpdate.phoneNumber = phoneNumber;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: dataToUpdate
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// POST /api/upload-resume - Handle PDF upload, parse text, and store in DB
app.post('/api/upload-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse the PDF buffer with robust error handling
    let resumeText = '';
    try {
      const pdfData = await pdfParse(req.file.buffer);
      resumeText = pdfData.text;
    } catch (parseError) {
      console.error("[PDF Parse Error]:", parseError);
      return res.status(500).json({ error: 'Failed to extract text from this PDF. It may be encrypted or use an unsupported format.' });
    }

    if (!resumeText || resumeText.trim().length === 0) {
      return res.status(400).json({ error: 'No readable text found in PDF. Make sure it is not an image-based PDF.' });
    }

    // Save to user
    const user = await prisma.user.findFirst();
    if (!user) return res.status(404).json({ error: 'User not found' });

    await prisma.user.update({
      where: { id: user.id },
      data: { resumeText }
    });

    res.json({ success: true, message: 'Resume uploaded and parsed successfully' });

    // Trigger AI matching in the background
    matchResumeToJobsBackground().catch(err => console.error("Background AI match error:", err));
  } catch (error) {
    console.error("Resume upload route error:", error);
    res.status(500).json({ error: 'Failed to process resume upload' });
  }
});

// POST /api/trigger-scrape - Manually trigger a scrape
app.post('/api/trigger-scrape', (req, res) => {
  // We use tsx to run the scraper index.ts, or just trigger the cron if it was exposed.
  // Actually, since the scraper is running in its own task with a cron, we can just run a one-off scrape.
  const scraperPath = path.resolve(__dirname, '../../../packages/scraper');
  console.log(`[API] Triggering manual scrape at ${scraperPath}`);
  
  // Fire and forget
  exec('npx tsx src/index.ts', { cwd: scraperPath }, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Scraper Trigger Error]: ${error.message}`);
      return;
    }
    console.log(`[Scraper Trigger Output]: ${stdout}`);
  });
  
  res.json({ success: true, message: 'Scraper triggered in background.' });
});

// POST /api/trigger-matching - Manually trigger AI matching
app.post('/api/trigger-matching', (req, res) => {
  matchResumeToJobsBackground().catch(err => console.error("Background AI match error:", err));
  res.json({ success: true, message: 'AI matching triggered in background.' });
});

// GET /api/jobs - Fetch jobs for the dashboard
app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await prisma.job.findMany({ orderBy: { createdAt: 'desc' }});
    const user = await prisma.user.findFirst();
    
    // Calculate dynamic Match Score
    let keywords: string[] = [];
    let targetLocations: string[] = [];
    if (user?.keywords) {
      try { keywords = JSON.parse(user.keywords).map((k: string) => k.toLowerCase()); } catch(e){}
    }
    if (user?.locations) {
      try { targetLocations = JSON.parse(user.locations).map((l: string) => l.toLowerCase()); } catch(e){}
    }
    const resumeWords = user?.resumeText ? user.resumeText.toLowerCase().split(/\W+/) : [];
    
    const scoredJobs = jobs.map(job => {
      let score = job.matchScore ?? 50; // Base score from AI Matcher if available
      
      const searchStr = `${job.title} ${job.company}`.toLowerCase();
      const jobLocStr = (job.location || '').toLowerCase();
      
      // Keyword match
      if (keywords.length > 0) {
        if (keywords.some(k => searchStr.includes(k))) score += 20;
        else score -= 10;
      }

      // Location match
      if (targetLocations.length > 0 && targetLocations[0] !== 'all india' && targetLocations[0] !== 'remote' && targetLocations[0] !== '') {
        // If the job has a location, and none of the target locations match
        if (jobLocStr !== 'unknown' && jobLocStr !== '') {
           const matchesLoc = targetLocations.some(tl => jobLocStr.includes(tl) || tl.includes(jobLocStr));
           if (matchesLoc) {
             score += 10;
           } else {
             // Heavily penalize jobs from a different location so they are hidden from the current active target
             score -= 40;
           }
        }
      }
      
      // Resume match (simple frequency check of job title words in resume)
      if (resumeWords.length > 0) {
        const titleWords = job.title.toLowerCase().split(/\W+/).filter(w => w.length > 3);
        let matchCount = 0;
        titleWords.forEach(w => {
          if (resumeWords.includes(w)) matchCount++;
        });
        if (matchCount > 0 && job.matchScore == null) score += (matchCount * 5); // Only add simple resume match if AI hasn't scored it
      }
      
      score = Math.min(Math.max(score, 10), 99); // Clamp between 10 and 99
      
      return { ...job, matchScore: score };
    });

    // Only return jobs that match the current target (score >= 50) 
    // OR jobs that the user has already interacted with (state !== 'NEW')
    const filteredJobs = scoredJobs.filter(job => job.matchScore >= 50 || job.state !== 'NEW');

    res.json(filteredJobs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /api/jobs/:id - Fetch a single job by ID
app.get('/api/jobs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// POST /api/jobs/:id/cover-letter - Generate AI Cover Letter
app.post('/api/jobs/:id/cover-letter', async (req, res) => {
  const { id } = req.params;
  try {
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const user = await prisma.user.findFirst();
    if (!user || !user.resumeText || user.resumeText.length < 50) {
      return res.status(400).json({ error: 'Please upload a resume in your profile first to generate a tailored cover letter.' });
    }

    if (!ai) {
      return res.status(500).json({ error: 'AI generation is not configured on the server.' });
    }

    const prompt = `
You are an expert career coach and professional cover letter writer.
Please write a highly tailored, professional, and compelling cover letter for the following job using the candidate's resume.

Candidate Resume:
"""
${user.resumeText.substring(0, 4000)}
"""

Job Details:
"""
Title: ${job.title}
Company: ${job.company}
Description:
${job.description?.substring(0, 4000) || "No detailed description available. Focus on the job title and company."}
"""

Instructions:
1. Do NOT include placeholder addresses like "[Your Name]" at the top unless necessary, just jump straight into the greeting (e.g., "Dear Hiring Manager," or "Dear [Company] Team,").
2. Keep it under 350 words.
3. Highlight 2-3 specific matching skills from the resume that fit the job perfectly.
4. Keep the tone professional, enthusiastic, and confident.
5. End with a strong call to action.
6. Output ONLY the cover letter text. Do NOT wrap it in markdown blocks or quotes.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const coverLetter = response.text?.trim() || "";
    if (!coverLetter) throw new Error("Generated cover letter was empty.");

    res.json({ success: true, coverLetter });
  } catch (error) {
    console.error("[Cover Letter Error]:", error);
    res.status(500).json({ error: 'Failed to generate cover letter.' });
  }
});

// PATCH /api/jobs/:id/state - Update job status (e.g. moved to "Applied")
app.patch('/api/jobs/:id/state', async (req, res) => {
  const { id } = req.params;
  const { state } = req.body; // e.g., 'APPLIED'

  try {
    const oldJob = await prisma.job.findUnique({ where: { id } });
    if (!oldJob) return res.status(404).json({ error: 'Job not found' });
    
    const updatedJob = await prisma.job.update({
      where: { id },
      data: { state },
    });
    
    if (oldJob.state !== state) {
      await prisma.timelineEvent.create({
        data: {
          jobId: id,
          type: 'STATE_CHANGE',
          description: `Moved job from ${oldJob.state} to ${state}`
        }
      });
    }

    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// GET /api/jobs/:id/notes
app.get('/api/jobs/:id/notes', async (req, res) => {
  const { id } = req.params;
  try {
    const notes = await prisma.note.findMany({
      where: { jobId: id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// POST /api/jobs/:id/notes
app.post('/api/jobs/:id/notes', async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Note text required' });

  try {
    const note = await prisma.note.create({
      data: {
        text,
        jobId: id,
      }
    });
    
    await prisma.timelineEvent.create({
      data: {
        jobId: id,
        type: 'NOTE_ADDED',
        description: `Added a note: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`
      }
    });

    res.json(note);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// GET /api/jobs/:id/timeline
app.get('/api/jobs/:id/timeline', async (req, res) => {
  const { id } = req.params;
  try {
    const events = await prisma.timelineEvent.findMany({
      where: { jobId: id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// DELETE /api/jobs/:id - Delete a job completely
app.delete('/api/jobs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.job.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// POST /api/generate-cover-letter
app.post('/api/generate-cover-letter', async (req, res) => {
  const { jobId, targetRole } = req.body;
  if (!jobId) return res.status(400).json({ error: 'Missing jobId' });

  try {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const user = await prisma.user.findFirst();
    
    const name = user?.name || "[Your Name]";
    const email = user?.email || "[Your Email]";
    const phone = user?.phoneNumber || "[Your Phone Number]";
    const linkedin = user?.linkedinUrl || "[LinkedIn Profile]";
    const github = user?.githubUrl || "[GitHub Profile]";
    
    const role = targetRole || "Software Engineer";
    
    let resumeContext = "No resume provided.";
    if (user?.resumeText) {
      resumeContext = user.resumeText.substring(0, 4000); // Extract large chunk for AI
    }

    let coverLetter = '';

    // Attempt to use Google Gemini AI if API Key is configured
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `
You are an expert career coach writing a highly tailored cover letter.
Write a professional, compelling, and concise cover letter for the following job:
Company: ${job.company}
Job Title: ${job.title}
Target Role: ${role}

Applicant Details:
Name: ${name}
Email: ${email}
Phone: ${phone}
LinkedIn: ${linkedin}
GitHub: ${github}

Applicant Resume Context:
${resumeContext}

Ensure the letter is formatted cleanly with standard letter spacing, highlights relevant experience from the resume matching the job title, and does not contain generic placeholders. Use today's date.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
        });
        coverLetter = response.text || '';
      } catch (aiError) {
        console.error("[Gemini AI Error]:", aiError);
      }
    }

    // Fallback template if no API key or AI generation fails
    if (!coverLetter) {
        const snippet = user?.resumeText ? user.resumeText.substring(0, 300).replace(/\n/g, ' ').trim() : '';
        const fallbackContext = snippet ? `\nMy background includes: ${snippet}...\n` : '';
        coverLetter = `
${name}
${email} | ${phone}
${linkedin} | ${github}

Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

Hiring Manager
${job.company}

Dear Hiring Team at ${job.company},

I am writing to express my strong interest in the ${job.title} position at ${job.company}, as advertised. With a solid foundation in ${role} and a passion for building scalable and user-centric applications, I am eager to bring my technical skills and problem-solving mindset to your engineering team.
${fallbackContext}
In my recent projects, I have demonstrated a strong ability to adapt to new technologies, architect robust systems, and deliver high-quality code. I am particularly drawn to ${job.company}'s innovative approach in the industry and am confident that my background in software development aligns perfectly with the requirements of the ${job.title} role.

Thank you for considering my application. I have attached my resume for your review and would welcome the opportunity to discuss how my skills and experiences can contribute to the continued success of ${job.company}.

Sincerely,

${name}
`.trim();
    }

    res.json({ coverLetter });
  } catch (error) {
    console.error("Failed to generate cover letter:", error);
    res.status(500).json({ error: 'Failed to generate cover letter' });
  }
});

import nodemailer from 'nodemailer';

// Helper to send email using Ethereal (fake SMTP for testing)
async function sendEmailNotification(jobTitle: string, company: string, url: string, userEmail: string) {
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
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

    console.log(`[EMAIL SENT] Preview URL: %s`, nodemailer.getTestMessageUrl(info));
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}

// Zod Schema for strict input validation
const JobNotificationSchema = z.object({
  jobTitle: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company name is required"),
  url: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  source: z.string().optional(),
  location: z.string().optional(),
  userId: z.string().optional(),
});

// POST /api/notify - Triggered by the Scraper worker when a new job is found
app.post('/api/notify', notifyLimiter, async (req, res) => {
  try {
    // 1. Strict Input Validation (Security)
    const validatedData = JobNotificationSchema.parse(req.body);
    const { jobTitle, company, url, source, location, userId } = validatedData;
    const user = userId 
      ? await prisma.user.findUnique({ where: { id: userId } })
      : await prisma.user.findFirst();
    if (user) {
      // Clean URL to prevent duplicates from query params
      const cleanUrl = url ? url.split('?')[0] : '';
      
      // Check if job exists either by exact URL or by Title + Company match for this user
      const existing = await prisma.job.findFirst({
        where: { 
          userId: user.id,
          OR: [
            { url: cleanUrl },
            { 
              title: jobTitle,
              company: company 
            }
          ]
        }
      });
      if (!existing) {
        await prisma.job.create({
          data: {
            title: jobTitle,
            company,
            url: cleanUrl || url,
            source: source || "Unknown",
            location: location || "Unknown",
            userId: user.id
          }
        });
        logger.info(`[DB] Saved New Job: ${jobTitle} at ${company}`);
        
        // Trigger Notifications
        if (user.notifyEmail) {
           await sendEmailNotification(jobTitle, company, url, user.email);
        }
        if (user.notifySms) {
           logger.info(`[SMS MOCK SENT] To: ${user.phoneNumber || 'User'} -> "Nexus ATS: New job match for ${jobTitle} at ${company}."`);
        }
      }
    }
    res.status(200).json({ message: 'Notification queued & saved.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[SECURITY] Invalid payload rejected:`, { errors: error.errors });
      res.status(400).json({ error: 'Invalid payload', details: error.errors });
      return;
    }
    logger.error("Failed to process notification", { error });
    res.status(500).json({ error: 'Failed to process notification' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`🚀 API Server running on port ${PORT}`);
});
