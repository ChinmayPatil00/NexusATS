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
      ? `User's Resume:\n${user.resumeText}\n\nRequirements:\n1. Make it sound professional, confident, and concise (under 400 words).\n2. Highlight the most relevant skills from the resume that match the job title and description.\n3. Do not include placeholders like [Your Name] if the information is not provided; just write a solid body paragraph.\n4. If you have the user's name (${user?.name}), use it to sign off.`
      : `Requirements:\n1. Make it sound professional, confident, and concise (under 400 words).\n2. Write a strong, tailored cover letter for the job description.\n3. Highlight dedication to problem-solving and rapid learning.`;

    let coverLetter = "";

    // 1. If GEMINI_API_KEY is present, attempt live AI generation
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `You are an expert career coach and professional copywriter.
Please write a highly tailored, professional cover letter for the following job opportunity.

Job Title: ${job.title}
Company: ${job.company}
Job Description: ${job.description || 'Not provided'}

${resumeContext}

Format the output cleanly with standard professional spacing.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
        });

        coverLetter = response.text || "";
      } catch (aiError: any) {
        console.warn("[Gemini Cover Letter AI Error]:", aiError.message);
      }
    }

    // 2. High-quality smart template fallback if GEMINI_API_KEY is not set or AI call fails
    if (!coverLetter) {
      const applicantName = user?.name || "Applicant";
      const applicantEmail = user?.email || "";
      const applicantPhone = user?.phoneNumber || "";
      const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      
      const resumeSnippet = user?.resumeText 
        ? user.resumeText.slice(0, 300).replace(/\s+/g, ' ').trim() 
        : '';

      const skillsHighlight = resumeSnippet
        ? `With a strong background in software engineering and demonstrated hands-on experience (including ${resumeSnippet}...), I have consistently built robust solutions, solved complex engineering hurdles, and collaborated across cross-functional teams.`
        : `Throughout my career in software development, I have focused on building scalable systems, writing clean and maintainable code, and quickly mastering modern tech stacks to deliver value.`;

      coverLetter = `${applicantName}
${[applicantEmail, applicantPhone].filter(Boolean).join(" | ")}
${[user?.linkedinUrl, user?.githubUrl].filter(Boolean).join(" | ")}

Date: ${currentDate}

Hiring Team
${job.company}

Dear Hiring Team at ${job.company},

I am writing to express my enthusiastic interest in the ${job.title} position at ${job.company}. Having followed your company's mission and engineering culture, I am excited about the opportunity to contribute my technical foundation and problem-solving skills to your team.

${skillsHighlight}

What particularly excites me about ${job.company} is the opportunity to tackle challenging technical initiatives alongside a high-performing, innovative team. I take pride in proactive communication, rapid execution under agile workflows, and a strong commitment to delivering exceptional user experiences.

Thank you for your time and consideration. I would welcome the opportunity to discuss how my background and enthusiasm make me a strong fit for the ${job.title} role.

Sincerely,

${applicantName}`;
    }

    return NextResponse.json({ coverLetter });
  } catch (error) {
    console.error("Error generating cover letter:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
