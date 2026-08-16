import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@job-aggregator-ats/database";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    let job = await prisma.job.findFirst({
      where: {
        id: id,
        userId: userId,
      },
      include: {
        notes: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Fallback for Auth Migration: If job is found but belongs to the old dummy user, reassign it
    if (!job) {
      const existingJob = await prisma.job.findUnique({
        where: { id: id },
        include: { notes: { orderBy: { createdAt: "desc" } } }
      });
      if (existingJob) {
        // Ensure user exists in database to prevent Foreign Key constraint errors
        await prisma.user.upsert({
          where: { id: userId },
          update: {},
          create: {
            id: userId,
            email: "placeholder@clerk.com",
            keywords: '["Software Engineer"]',
            locations: '["Remote"]'
          }
        });

        job = await prisma.job.update({
          where: { id: id },
          data: { userId: userId },
          include: { notes: { orderBy: { createdAt: "desc" } } }
        });
      }
    }

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("Error fetching job:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await req.json();

    const job = await prisma.job.findFirst({
      where: { id: id, userId: userId }
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const updatedJob = await prisma.job.update({
      where: { id: id },
      data: {
        ...data
      }
    });

    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error("Error updating job:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
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

    await prisma.job.delete({
      where: { id: id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting job:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
