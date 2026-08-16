import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@job-aggregator-ats/database";
import { auth } from "@clerk/nextjs/server";

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

    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
        return NextResponse.json({ error: "Invalid note text" }, { status: 400 });
    }

    const note = await prisma.note.create({
      data: {
        text,
        jobId: job.id
      }
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
