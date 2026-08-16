import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const userId = 'cmshpcv400000q7i6n44ntkn1';
  const jobs = await prisma.job.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  let keywords: string[] = [];
  let targetLocations: string[] = [];
  if (user?.keywords) {
    try { keywords = JSON.parse(user.keywords).map((k: string) => k.toLowerCase()); } catch(e){}
  }
  if (user?.locations) {
    try { targetLocations = JSON.parse(user.locations).map((l: string) => l.toLowerCase()); } catch(e){}
  }
  const resumeWords = user?.resumeText ? user.resumeText.toLowerCase().split(/\W+/) : [];
  
  const scoredJobs = jobs.map(job => {
    let score = 50;
    
    const searchStr = `${job.title} ${job.company}`.toLowerCase();
    const jobLocStr = (job.location || '').toLowerCase();
    
    if (keywords.length > 0) {
      if (keywords.some(k => searchStr.includes(k))) score += 20;
      else score -= 10;
    }

    if (targetLocations.length > 0 && targetLocations[0] !== 'all india' && targetLocations[0] !== 'remote' && targetLocations[0] !== '') {
      if (jobLocStr !== 'unknown' && jobLocStr !== '') {
         const matchesLoc = targetLocations.some(tl => jobLocStr.includes(tl) || tl.includes(jobLocStr));
         if (matchesLoc) {
           score += 10;
         } else {
           score -= 40;
         }
      }
    }
    
    if (resumeWords.length > 0) {
      const titleWords = job.title.toLowerCase().split(/\W+/).filter(w => w.length > 3);
      let matchCount = 0;
      titleWords.forEach(w => {
        if (resumeWords.includes(w)) matchCount++;
      });
      if (matchCount > 0) score += (matchCount * 5);
    }
    
    score = Math.min(Math.max(score, 10), 99);
    
    return { title: job.title, loc: job.location, score };
  });

  const filteredJobs = scoredJobs.filter(job => job.score >= 50);
  console.log('Total jobs:', scoredJobs.length);
  console.log('Filtered jobs (score >= 50):', filteredJobs.length);
  console.log('Sample filtered jobs:', filteredJobs.slice(0, 5));
  console.log('Keywords:', keywords);
  console.log('Locations:', targetLocations);
}

main().finally(() => prisma.$disconnect());
