import { prisma } from '@job-aggregator-ats/database';

async function main() {
  console.log("Starting deduplication cleanup...");
  const jobs = await prisma.job.findMany();
  
  const seen = new Set();
  const toDelete = [];

  for (const job of jobs) {
    const key = `${job.title}-${job.company}`;
    
    if (seen.has(key)) {
      toDelete.push(job.id);
    } else {
      seen.add(key);
    }
  }

  if (toDelete.length > 0) {
    console.log(`Found ${toDelete.length} duplicates. Deleting...`);
    await prisma.job.deleteMany({
      where: {
        id: { in: toDelete }
      }
    });
    console.log("Cleanup complete!");
  } else {
    console.log("No duplicates found.");
  }
}

main().catch(console.error);
