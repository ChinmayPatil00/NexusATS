import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@job-aggregator-ats/database";
import { auth } from "@clerk/nextjs/server";
const pdfParse = require("pdf-parse");

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("resume") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let resumeText = '';

    try {
      const pdfData = await pdfParse(buffer);
      resumeText = pdfData.text;
    } catch (parseError) {
      console.error("[PDF Parse Error]:", parseError);
      return NextResponse.json(
        { error: "Failed to extract text from this PDF. It may be encrypted or use an unsupported format." },
        { status: 500 }
      );
    }

    if (!resumeText || resumeText.trim().length === 0) {
      return NextResponse.json(
        { error: "No readable text found in PDF. Make sure it is not an image-based PDF." },
        { status: 400 }
      );
    }

    // Upsert user just in case it doesn't exist yet
    await prisma.user.upsert({
      where: { id: userId },
      update: { resumeText },
      create: {
        id: userId,
        email: "placeholder@clerk.com",
        resumeText,
        keywords: '["Software Engineer"]',
        locations: '["Remote"]'
      }
    });

    return NextResponse.json({ success: true, message: "Resume uploaded successfully" });
  } catch (error) {
    console.error("Resume upload error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
