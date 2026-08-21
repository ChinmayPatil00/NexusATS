import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@job-aggregator-ats/database";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch jobs for the user
    let jobs = await prisma.job.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    // Fallback for Auth Migration: If no jobs found for this new Clerk user,
    // let's grab jobs that belong to the old dummy users and reassign them to this user.
    if (jobs.length === 0) {
      const oldJobs = await prisma.job.findMany({
        where: { userId: { not: userId } },
        orderBy: { createdAt: "desc" },
      });
      
      if (oldJobs.length > 0) {
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

        await prisma.job.updateMany({
          where: { userId: { not: userId } },
          data: { userId: userId }
        });
        
        jobs = await prisma.job.findMany({
          where: { userId: userId },
          orderBy: { createdAt: "desc" },
          take: 1000,
        });
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    // Deduplicate jobs by title and company (case-insensitive) to prevent repeating cards
    const uniqueJobsMap = new Map<string, typeof jobs[0]>();
    for (const job of jobs) {
      const key = `${job.title.toLowerCase()}||${job.company.toLowerCase()}`;
      if (!uniqueJobsMap.has(key)) {
        uniqueJobsMap.set(key, job);
      }
    }
    const deduplicatedJobs = Array.from(uniqueJobsMap.values());
    
    // Calculate dynamic Match Score
    let keywords: string[] = [];
    let targetLocations: string[] = [];
    if (user?.keywords) {
      try { keywords = JSON.parse(user.keywords).map((k: string) => k.toLowerCase()); } catch(e){}
    }
    if (user?.locations) {
      try { targetLocations = JSON.parse(user.locations).map((l: string) => l.toLowerCase()); } catch(e){}
    }
    const resumeWords = user?.resumeText ? user.resumeText.toLowerCase().split(/\W+/) : [];
    
    const scoredJobs = deduplicatedJobs.map(job => {
      let score = 50; // Base score
      
      const searchStr = `${job.title} ${job.company}`.toLowerCase();
      const jobLocStr = (job.location || '').toLowerCase();
      
      // Keyword match
      if (keywords.length > 0) {
        if (keywords.some(k => searchStr.includes(k))) score += 20;
        else score -= 10;
      }

      // Location match
      if (targetLocations.length > 0 && targetLocations[0] !== 'all india' && targetLocations[0] !== 'remote' && targetLocations[0] !== '') {
        // If the job has a location, and none of the target locations match
        if (jobLocStr !== 'unknown' && jobLocStr !== '') {
           const matchesLoc = targetLocations.some(tl => jobLocStr.includes(tl) || tl.includes(jobLocStr));
           if (matchesLoc) {
             score += 10;
           } else {
             score -= 40;
           }
        }
      }
      
      // Resume match (simple frequency check of job title words in resume)
      if (resumeWords.length > 0) {
        const titleWords = job.title.toLowerCase().split(/\W+/).filter(w => w.length > 3);
        let matchCount = 0;
        titleWords.forEach(w => {
          if (resumeWords.includes(w)) matchCount++;
        });
        if (matchCount > 0) score += (matchCount * 5);
      }
      
      score = Math.min(Math.max(score, 10), 99); // Clamp between 10 and 99
      
      return { ...job, matchScore: score };
    });

    const filteredJobs = scoredJobs; // Show all jobs instead of filtering by score

    return NextResponse.json(filteredJobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
