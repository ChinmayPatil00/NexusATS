import cron from 'node-cron';
import { scrapeLinkedIn } from './linkedin';
import { scrapeIndeed } from './indeed';
import { scrapeApna } from './apna';
import { scrapeUnstop } from './unstop';
import { scrapeYCombinator } from './ycombinator';
import { scrapeWellfound } from './wellfound';

let isScraperActive = false;

// Helper to notify the API when new jobs are found
async function notifyAPI(jobs: any[], targetUserId?: string) {
  if (jobs.length === 0) return;
  const port = process.env.PORT || 4000;
  console.log(`Found ${jobs.length} total jobs. Sending to API for bulk ingestion...`);

  // Try bulk endpoint first for maximum speed (<50ms)
  try {
    const res = await fetch(`http://localhost:${port}/api/notify-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobs: jobs.map(j => ({
          title: j.title,
          company: j.company,
          url: j.url,
          source: j.source,
          location: j.location || "Unknown"
        })),
        userId: targetUserId
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (res.ok) {
      const data: any = await res.json();
      console.log(`⚡ [API Bulk] Successfully processed ${jobs.length} jobs (${data.savedCount ?? 0} newly saved)!`);
      return;
    }
  } catch (err: any) {
    console.warn(`[API Bulk] Batch notify failed (${err.message}), falling back to concurrent single notifications...`);
  }

  // Fallback: Concurrent chunks of 10
  const chunkSize = 10;
  for (let i = 0; i < jobs.length; i += chunkSize) {
    const chunk = jobs.slice(i, i + chunkSize);
    await Promise.allSettled(
      chunk.map(job =>
        fetch(`http://localhost:${port}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobTitle: job.title,
            company: job.company,
            url: job.url,
            source: job.source,
            location: job.location || "Unknown",
            userId: targetUserId
          }),
          signal: AbortSignal.timeout(5000)
        }).catch(() => {})
      )
    );
  }
}

import { scrapeNaukri } from './naukri';
import { scrapeInternshala } from './internshala';
import { prisma } from '@job-aggregator-ats/database';

async function runAllScrapers(targetUserId?: string) {
  if (isScraperActive) {
    console.log('[Scraper] Another scrape is currently active. Skipping duplicate run.');
    return;
  }
  isScraperActive = true;
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] 🚀 Starting Scraper Job (High-Speed Parallel Mode)...`);
  
  try {
    const user = targetUserId 
      ? await prisma.user.findUnique({ where: { id: targetUserId } })
      : await prisma.user.findFirst();
      
    if (!user) {
      console.log('No user found in DB. Exiting.');
      return;
    }
    
    let keywordsArray = ['Software Engineer'];
    let locationsArray = ['Remote'];
    try {
      if (user.keywords) keywordsArray = JSON.parse(user.keywords);
      if (user.locations) locationsArray = JSON.parse(user.locations);
    } catch(e) {
      console.error('Failed to parse user preferences from DB', e);
    }
    
    const keywords = keywordsArray[0] || 'Software Engineer';
    const location = locationsArray[0] || 'Remote';
    
    console.log(`Using preferences -> Role: ${keywords}, Location: ${location}`);

    const scraperTasks = [
      { name: 'LinkedIn', fn: () => scrapeLinkedIn(keywords, location) },
      { name: 'Indeed', fn: () => scrapeIndeed(keywords, location) },
      { name: 'Naukri', fn: () => scrapeNaukri(keywords, location) },
      { name: 'Apna', fn: () => scrapeApna(keywords, location) },
      { name: 'Unstop', fn: () => scrapeUnstop(keywords, location) },
      { name: 'YCombinator', fn: () => scrapeYCombinator(keywords, location) },
      { name: 'Wellfound', fn: () => scrapeWellfound(keywords, location) },
    ];

    if (keywords.toLowerCase().includes('intern') || keywordsArray.some((k: string) => k.toLowerCase().includes('intern'))) {
      scraperTasks.push({ name: 'Internshala', fn: () => scrapeInternshala(keywords, location) });
    }

    console.log(`⚡ Dispatching ${scraperTasks.length} scrapers in parallel...`);
    const allJobs: any[] = [];

    const results = await Promise.allSettled(
      scraperTasks.map(async (task) => {
        const taskStart = Date.now();
        try {
          const jobs = await task.fn();
          const taskDuration = ((Date.now() - taskStart) / 1000).toFixed(1);
          console.log(`✅ [${task.name}] Scraped ${jobs.length} jobs in ${taskDuration}s.`);
          return jobs;
        } catch (e: any) {
          console.error(`❌ [${task.name}] Failed: ${e.message}`);
          return [];
        }
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        allJobs.push(...result.value);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`🎉 All scrapers completed in ${elapsed}s! Total opportunities scraped: ${allJobs.length}`);

    await notifyAPI(allJobs, user.id);

  } catch (error) {
    console.error('❌ Error during scraping run:', error);
  } finally {
    isScraperActive = false;
    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[${new Date().toISOString()}] 🏁 Scraper Job Finished in ${totalElapsed}s.\n`);
  }
}

// ==========================================
// CRON SCHEDULE
// ==========================================
// Run at 08:00 AM every morning (0 8 * * *)
// For testing purposes, we'll set it to run every 5 minutes (*/5 * * * *)

const SCHEDULE = '*/5 * * * *';

// If started with a userId argument, just run once for that user
const argsUserId = process.argv[2];

if (argsUserId) {
  console.log(`Running one-off scrape for user ${argsUserId}`);
  runAllScrapers(argsUserId);
} else {
  console.log(`Setting up Scraper Cron Job with schedule: ${SCHEDULE}`);
  cron.schedule(SCHEDULE, async () => {
    const users = await prisma.user.findMany();
    console.log(`Running cron scrape for ${users.length} users...`);
    for (const user of users) {
      await runAllScrapers(user.id);
    }
  });
  // Run it once immediately on startup for all users
  prisma.user.findMany().then(users => {
    for (const user of users) {
      runAllScrapers(user.id);
    }
  });
}
