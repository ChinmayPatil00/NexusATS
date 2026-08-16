import { GoogleGenAI } from '@google/genai';
import { prisma } from '@job-aggregator-ats/database';
import winston from 'winston';

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

// Initialize Gemini
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

export async function matchResumeToJobsBackground() {
  if (!ai) {
    logger.warn("[AI Matcher] GEMINI_API_KEY not found. Skipping AI matching.");
    return;
  }

  try {
    const user = await prisma.user.findFirst();
    if (!user || !user.resumeText || user.resumeText.trim().length === 0) {
      logger.info("[AI Matcher] No user resume text available to match.");
      return;
    }

    // Find jobs that have not been scored yet
    const jobsToMatch = await prisma.job.findMany({
      where: { matchScore: null },
      take: 10 // Batch size to avoid rate limits
    });

    if (jobsToMatch.length === 0) {
      return;
    }

    logger.info(`[AI Matcher] Starting AI evaluation for ${jobsToMatch.length} jobs.`);

    for (const job of jobsToMatch) {
      if (!job.description || job.description.length < 50) {
        // Fallback for jobs with no description
        await prisma.job.update({
          where: { id: job.id },
          data: { matchScore: 50, matchRationale: "No detailed job description provided to analyze." }
        });
        continue;
      }

      try {
        const prompt = `
You are an expert ATS (Applicant Tracking System) recruiter AI.
You are evaluating a candidate's resume against a job description.

Candidate Resume Text:
"""
${user.resumeText.substring(0, 4000)} // Truncating to avoid massive token limits just in case
"""

Job Description:
"""
Title: ${job.title}
Company: ${job.company}
Description:
${job.description.substring(0, 4000)}
"""

Task:
Evaluate how well the candidate's skills and experience match the job requirements.
Output ONLY a strict JSON object with no markdown wrappers or additional text, in this exact format:
{
  "score": <integer from 0 to 100 representing the match percentage>,
  "rationale": "<A 2-3 sentence explanation of why this score was given, highlighting key matching skills or missing crucial requirements>"
}
`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
        });

        const outputText = response.text?.trim() || "";
        
        // Try to parse JSON. Gemini might wrap it in \`\`\`json ... \`\`\`
        const jsonMatch = outputText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (typeof parsed.score === 'number' && typeof parsed.rationale === 'string') {
            await prisma.job.update({
              where: { id: job.id },
              data: {
                matchScore: parsed.score,
                matchRationale: parsed.rationale
              }
            });
            logger.info(`[AI Matcher] Scored job ${job.id} - Score: ${parsed.score}`);
          } else {
             throw new Error("Parsed JSON did not contain score or rationale");
          }
        } else {
           throw new Error("No JSON object found in output");
        }
      } catch (err) {
        logger.error(`[AI Matcher] Failed to evaluate job ${job.id}:`, err);
        // We set score to 0 to prevent infinite loops, but rationale states error
        await prisma.job.update({
          where: { id: job.id },
          data: { matchScore: 0, matchRationale: "Failed to evaluate via AI due to parsing error." }
        });
      }
      
      // Delay to respect rate limits
      await new Promise(r => setTimeout(r, 1000));
    }

    logger.info(`[AI Matcher] Finished batch of ${jobsToMatch.length} jobs.`);

    // If we processed 10, there might be more. We can recursively call it or let a cron handle it.
    if (jobsToMatch.length === 10) {
       setTimeout(matchResumeToJobsBackground, 2000);
    }
  } catch (error) {
    logger.error("[AI Matcher] Critical error:", error);
  }
}
