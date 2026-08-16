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

    const job = await prisma.job.findFirst({
      where: { id: id, userId: userId }
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.resumeText) {
      return NextResponse.json({ error: "Resume text missing in profile. Please update your profile first." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
You are an expert career coach and professional copywriter.
Please write a highly tailored, professional cover letter for the following job opportunity based on the provided resume.

Job Title: ${job.title}
Company: ${job.company}
Job Description: ${job.description || 'Not provided'}

User's Resume:
${user.resumeText}

Requirements:
1. Make it sound professional, confident, and concise (under 400 words).
2. Highlight the most relevant skills from the resume that match the job title and description.
3. Do not include placeholders like [Your Name] if the information is not provided; just write a solid body paragraph.
4. If you have the user's name (${user.name}), use it to sign off.
5. Format the output with clean spacing.
`;

    const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
    });

    const coverLetter = response.text || "Could not generate cover letter.";

    return NextResponse.json({ coverLetter });
  } catch (error) {
    console.error("Error generating cover letter:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
