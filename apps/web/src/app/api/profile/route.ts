import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@job-aggregator-ats/database";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Upsert the user so it's created if it doesn't exist yet
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: "placeholder@clerk.com",
        keywords: '["Software Engineer"]',
        locations: '["Remote"]'
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { keywords, locations, name, githubUrl, linkedinUrl, phoneNumber } = await req.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataToUpdate: any = {};
    if (keywords !== undefined) dataToUpdate.keywords = JSON.stringify(keywords);
    if (locations !== undefined) dataToUpdate.locations = JSON.stringify(locations);
    if (name !== undefined) dataToUpdate.name = name;
    if (githubUrl !== undefined) dataToUpdate.githubUrl = githubUrl;
    if (linkedinUrl !== undefined) dataToUpdate.linkedinUrl = linkedinUrl;
    if (phoneNumber !== undefined) dataToUpdate.phoneNumber = phoneNumber;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate
    });
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
