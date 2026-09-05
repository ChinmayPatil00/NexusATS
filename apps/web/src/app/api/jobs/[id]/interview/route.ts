import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@job-aggregator-ats/database";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const job = await prisma.job.findUnique({
      where: { id: id }
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    const resumeContext = user?.resumeText 
      ? `Here is my resume:\n${user.resumeText}\n\nBased ONLY on the skills and experience in my resume compared to the requirements in the job description, generate EXACTLY 4 highly specific, challenging technical or behavioral interview questions that this company is likely to ask me.`
      : `Based on the job title (${job.title}) and company (${job.company}), generate EXACTLY 4 highly specific, challenging technical or behavioral interview questions that this company is likely to ask a candidate applying for this role.`;

    let questions: string[] = [];

    // 1. If GEMINI_API_KEY is present, attempt live AI question generation
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `You are an expert technical interviewer and career coach.
I am preparing for an interview for the following job:
Job Title: ${job.title}
Company: ${job.company}
Job Description: ${job.description || 'Not provided'}

${resumeContext}

Do not ask generic questions like "What are your strengths?"
Ask scenario-based, role-specific questions for ${job.title} at ${job.company}.

Format the output strictly as a JSON array of strings, for example:
[
  "Question 1",
  "Question 2",
  "Question 3",
  "Question 4"
]
Do NOT wrap the JSON in markdown code blocks like \`\`\`json. Just output the raw JSON array.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
        });

        const text = response.text || "[]";
        try {
          questions = JSON.parse(text.trim());
          if (!Array.isArray(questions)) questions = [];
        } catch {
          const lines = text.split('\n').filter(l => l.trim().length > 10);
          questions = lines.slice(0, 4).map(l => l.replace(/^[\d\-\.\*\[\]"\s]+/, '').trim());
        }
      } catch (aiError: any) {
        console.warn("[Gemini Interview Prep AI Error]:", aiError.message);
      }
    }

    // 2. High-quality role-specific fallback if GEMINI_API_KEY is not set or AI call fails
    if (questions.length === 0) {
      questions = [
        `Can you walk us through how you would architect and scale a core feature for the ${job.title} position at ${job.company}?`,
        `Given the technical demands of ${job.company}, how have you resolved critical production incidents or performance bottlenecks in your previous projects?`,
        `Tell us about a time you had to master a new framework or technology stack under tight delivery deadlines. What was your strategy?`,
        `How do your previous engineering experiences align with ${job.company}'s engineering culture and goals for the ${job.title} role?`
      ];
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Error generating interview prep:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
