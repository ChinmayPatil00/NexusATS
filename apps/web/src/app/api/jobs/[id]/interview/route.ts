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
      ? `Here is my resume:\n${user.resumeText}\n\nBased ONLY on the skills and experience in my resume compared to the requirements in the job description, generate EXACTLY 4 highly specific, challenging technical or behavioral interview questions that this company is likely to ask me.`
      : `Based on the job title and description, generate EXACTLY 4 highly specific, challenging technical or behavioral interview questions that this company is likely to ask a candidate applying for this role.`;

    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
You are an expert technical interviewer and career coach.
I am preparing for an interview for the following job:
Job Title: ${job.title}
Company: ${job.company}
Job Description: ${job.description || 'Not provided'}

${resumeContext}

Do not ask generic questions like "What are your strengths?"
Ask things like "In your resume, you mentioned you built X using Y. How would you scale that to handle the traffic we expect at [Company]?" (or similar scenario-based questions based on the role).

Format the output strictly as a JSON array of strings, for example:
[
  "Question 1",
  "Question 2",
  "Question 3",
  "Question 4"
]
Do NOT wrap the JSON in markdown code blocks like \`\`\`json. Just output the raw JSON array.
`;

    const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
    });

    const text = response.text || "[]";
    let questions: string[] = [];
    
    try {
        questions = JSON.parse(text.trim());
        if (!Array.isArray(questions)) throw new Error("Not an array");
    } catch (e) {
        // Fallback if AI messes up format
        const lines = text.split('\n').filter(l => l.trim().length > 10);
        questions = lines.slice(0, 4).map(l => l.replace(/^[\d\-\.\*\[\]"\s]+/, '').trim());
    }

    if (questions.length === 0) {
        questions = [
            "Can you walk me through your most complex recent project?",
            "How does your past experience align with our engineering culture?",
            "Explain a complex technical problem you solved recently and the trade-offs you made.",
            "What are the most critical technologies you'd bring to the table for this role?"
        ];
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Error generating interview prep:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
