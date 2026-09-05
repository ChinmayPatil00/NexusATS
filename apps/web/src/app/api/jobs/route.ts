import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@job-aggregator-ats/database";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  try {
    let activeUserId: string | null = null;
    try {
      const authData = await auth();
      activeUserId = authData.userId;
    } catch {
      // Unauthenticated or session loading
    }

    if (!activeUserId && req.nextUrl?.searchParams) {
      activeUserId = req.nextUrl.searchParams.get("userId");
    }

    // Fetch jobs for user or return all jobs if unauthenticated
    let jobs: any[] = [];
    let user = null;

    if (activeUserId) {
      await prisma.user.upsert({
        where: { id: activeUserId },
        update: {},
        create: {
          id: activeUserId,
          email: `${activeUserId}@clerk.local`,
          keywords: '["Software Engineer"]',
          locations: '["Remote"]'
        }
      });

      jobs = await prisma.job.findMany({
        where: { userId: activeUserId },
        orderBy: { createdAt: "desc" },
        take: 1000,
      });

      // If this user has no specific jobs yet, show all available scraped jobs
      if (jobs.length === 0) {
        jobs = await prisma.job.findMany({
          orderBy: { createdAt: "desc" },
          take: 1000,
        });
      }

      user = await prisma.user.findUnique({
        where: { id: activeUserId }
      });
    } else {
      jobs = await prisma.job.findMany({
        orderBy: { createdAt: "desc" },
        take: 1000,
      });
    }
    
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
        if (keywords.some((k: string) => searchStr.includes(k))) score += 20;
        else score -= 10;
      }

      // Location match
      if (targetLocations.length > 0 && targetLocations[0] !== 'all india' && targetLocations[0] !== 'remote' && targetLocations[0] !== '') {
        // If the job has a location, and none of the target locations match
        if (jobLocStr !== 'unknown' && jobLocStr !== '') {
           const matchesLoc = targetLocations.some((tl: string) => jobLocStr.includes(tl) || tl.includes(jobLocStr));
           if (matchesLoc) {
             score += 10;
           } else {
             score -= 40;
           }
        }
      }
      
      // Resume match (simple frequency check of job title words in resume)
      if (resumeWords.length > 0) {
        const titleWords = job.title.toLowerCase().split(/\W+/).filter((w: string) => w.length > 3);
        let matchCount = 0;
        titleWords.forEach((w: string) => {
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
