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

    const resumeContext = user?.resumeText
      ? `User's Resume:\n${user.resumeText}\n\nRequirements:\n1. Make it sound professional, confident, and concise (under 400 words).\n2. Highlight the most relevant skills from the resume that match the job title and description.\n3. Do not include placeholders like [Your Name] if the information is not provided; just write a solid body paragraph.\n4. If you have the user's name (${user?.name}), use it to sign off.`
      : `Requirements:\n1. Make it sound professional, confident, and concise (under 400 words).\n2. Write a strong, generic cover letter tailored to the job description that the user can fill their own details into.\n3. Use placeholders like [Your Name] or [Your Previous Company] where appropriate so the user knows what to fill in.`;

    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
You are an expert career coach and professional copywriter.
Please write a highly tailored, professional cover letter for the following job opportunity.

Job Title: ${job.title}
Company: ${job.company}
Job Description: ${job.description || 'Not provided'}

${resumeContext}

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
