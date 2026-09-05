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

// Rate limiter for notify endpoint (relaxed for local scraper)
const notifyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 600,
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
  const { userId } = req.query;
  try {
    const jobs = await prisma.job.findMany({ 
      where: userId ? { userId: String(userId) } : undefined,
      orderBy: { createdAt: 'desc' }
    });
    const user = userId ? await prisma.user.findUnique({ where: { id: String(userId) } }) : await prisma.user.findFirst();
    
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
      
      const searchStr = (job.title + " " + job.company).toLowerCase();
      const jobLocStr = (job.location || '').toLowerCase();
      
      if (job.matchScore == null) {
        // Keyword match
        if (keywords.length > 0) {
          if (keywords.some(k => searchStr.includes(k))) score += 20;
          else score -= 10;
        }
        
        // Location match
        if (targetLocations.length > 0 && targetLocations[0] !== 'all india' && targetLocations[0] !== 'remote' && targetLocations[0] !== '') {
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
      }
      
      return { ...job, matchScore: score };
    });

    const filteredJobs = scoredJobs; // Show all jobs instead of filtering by score

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
    let coverLetter = '';

    // Attempt Gemini live generation if key is present
    if (process.env.GEMINI_API_KEY) {
      try {
        const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const resumeSnippet = user?.resumeText ? user.resumeText.substring(0, 3000) : 'General Software Engineering experience';
        const prompt = `
You are an expert career coach and professional cover letter writer.
Please write a highly tailored, professional, and compelling cover letter for the following job using the candidate's resume background.

Candidate Resume Background:
"""
${resumeSnippet}
"""

Job Details:
Title: ${job.title}
Company: ${job.company}
Description:
${job.description?.substring(0, 3000) || "Focus on the role and company culture."}

Instructions:
1. Keep it concise, under 350 words.
2. Highlight 2-3 specific skills matching the job.
3. Keep the tone professional, enthusiastic, and confident.
4. End with a strong call to action.
5. Output ONLY the cover letter text.
`;

        const response = await aiClient.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
        });

        coverLetter = response.text?.trim() || '';
      } catch (aiError: any) {
        console.warn('[Gemini Cover Letter API Error]:', aiError.message);
      }
    }

    // High quality fallback if GEMINI_API_KEY is not configured or AI fails
    if (!coverLetter) {
      const applicantName = user?.name || "Applicant";
      const applicantEmail = user?.email || "";
      const applicantPhone = user?.phoneNumber || "";
      const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const resumeSnippet = user?.resumeText 
        ? user.resumeText.slice(0, 300).replace(/\s+/g, ' ').trim() 
        : '';

      const skillsHighlight = resumeSnippet
        ? `With a strong background in software development (including ${resumeSnippet}...), I have a proven record of building dependable software, solving complex challenges, and collaborating effectively across teams.`
        : `Throughout my career in software engineering, I have focused on writing clean, scalable code, collaborating in agile environments, and quickly adapting to modern frameworks to deliver high-quality products.`;

      coverLetter = `${applicantName}
${[applicantEmail, applicantPhone].filter(Boolean).join(" | ")}
${[user?.linkedinUrl, user?.githubUrl].filter(Boolean).join(" | ")}

Date: ${currentDate}

Hiring Team
${job.company}

Dear Hiring Team at ${job.company},

I am writing to express my enthusiastic interest in the ${job.title} position at ${job.company}. Having followed your company's growth and engineering work, I am eager to contribute my technical foundation and problem-solving skills to your team.

${skillsHighlight}

What particularly excites me about ${job.company} is the opportunity to tackle challenging technical initiatives alongside a high-performing, innovative team. I take pride in proactive communication, rapid execution under agile workflows, and a strong commitment to delivering exceptional user experiences.

Thank you for your time and consideration. I would welcome the opportunity to discuss how my background and enthusiasm make me a strong fit for the ${job.title} role.

Sincerely,

${applicantName}`;
    }

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
          model: 'gemini-3.6-flash',
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

// POST /api/notify-batch - High-speed bulk ingestion of scraped jobs
app.post('/api/notify-batch', async (req, res) => {
  try {
    const { jobs, userId } = req.body;
    if (!Array.isArray(jobs) || jobs.length === 0) {
      return res.status(200).json({ count: 0, savedCount: 0 });
    }

    const user = userId 
      ? await prisma.user.findUnique({ where: { id: userId } })
      : await prisma.user.findFirst();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let savedCount = 0;
    for (const job of jobs) {
      const cleanUrl = job.url ? job.url.split('?')[0] : '';
      const existing = await prisma.job.findFirst({
        where: {
          userId: user.id,
          OR: [
            { url: cleanUrl },
            { title: job.title, company: job.company }
          ]
        }
      });

      if (!existing) {
        await prisma.job.create({
          data: {
            title: job.title,
            company: job.company,
            url: cleanUrl || job.url,
            source: job.source || 'Unknown',
            location: job.location || 'Unknown',
            userId: user.id
          }
        });
        savedCount++;
      }
    }

    logger.info(`[DB Bulk] Saved ${savedCount} new jobs out of ${jobs.length} scraped for user ${user.id}.`);
    return res.status(200).json({ savedCount, totalReceived: jobs.length });
  } catch (error) {
    logger.error('Failed to process batch notification', { error });
    return res.status(500).json({ error: 'Failed to process batch notification' });
  }
});


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`🚀 API Server running on port ${PORT}`);

  // Launch scraper worker in background after server is ready to accept notifications
  const scraperPath = path.resolve(__dirname, '../../../packages/scraper');
  const scraperProcess = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: scraperPath,
    stdio: 'inherit',
    shell: true
  });

  scraperProcess.on('error', (err) => {
    logger.warn('Scraper worker spawn warning:', { err });
  });
});

