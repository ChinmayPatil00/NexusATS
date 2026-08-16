import cron from 'node-cron';
import { scrapeLinkedIn } from './linkedin';
import { scrapeIndeed } from './indeed';
import { scrapeApna } from './apna';
import { scrapeUnstop } from './unstop';
import { scrapeYCombinator } from './ycombinator';
import { scrapeWellfound } from './wellfound';

// Helper to notify the API when new jobs are found
async function notifyAPI(jobs: any[], targetUserId?: string) {
  if (jobs.length === 0) return;
  
  console.log(`Found ${jobs.length} total jobs. Sending to API for deduplication and notification...`);
  
  for (const job of jobs) {
    try {
      await fetch('http://localhost:4000/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: job.title,
          company: job.company,
          url: job.url,
          source: job.source,
          location: job.location || "Unknown",
          userId: targetUserId
        })
      });
    } catch (err) {
      console.error('Failed to notify API for job:', job.title);
    }
  }
}

import { scrapeNaukri } from './naukri';
import { scrapeInternshala } from './internshala';
import { prisma } from '@job-aggregator-ats/database';

async function runAllScrapers(targetUserId?: string) {
  console.log(`[${new Date().toISOString()}] 🚀 Starting Scraper Job...`);
  
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
    
    // We just take the first preference for now for simplicity,
    // or we could loop over all of them.
    const keywords = keywordsArray[0] || 'Software Engineer';
    const location = locationsArray[0] || 'Remote';
    
    console.log(`Using preferences -> Role: ${keywords}, Location: ${location}`);

    console.log('Scraping LinkedIn...');
    const allJobs: any[] = [];
    try {
      const linkedInJobs = await scrapeLinkedIn(keywords, location);
      console.log(`✅ LinkedIn scraped ${linkedInJobs.length} jobs.`);
      allJobs.push(...linkedInJobs);
    } catch (e: any) {
      console.error(`❌ LinkedIn failed: ${e.message}`);
    }

    console.log('Scraping Indeed...');
    try {
      const indeedJobs = await scrapeIndeed(keywords, location);
      console.log(`✅ Indeed scraped ${indeedJobs.length} jobs.`);
      allJobs.push(...indeedJobs);
    } catch (e: any) {
      console.error(`❌ Indeed failed: ${e.message}`);
    }

    console.log('Scraping Naukri...');
    try {
      const naukriJobs = await scrapeNaukri(keywords, location);
      console.log(`✅ Naukri scraped ${naukriJobs.length} jobs.`);
      allJobs.push(...naukriJobs);
    } catch (e: any) {
      console.error(`❌ Naukri failed: ${e.message}`);
    }

    if (keywords.toLowerCase().includes('intern') || keywordsArray.some((k: string) => k.toLowerCase().includes('intern'))) {
       console.log('Scraping Internshala...');
       try {
         const internshalaJobs = await scrapeInternshala(keywords, location);
         console.log(`✅ Internshala scraped ${internshalaJobs.length} jobs.`);
         allJobs.push(...internshalaJobs);
       } catch (e: any) {
         console.error(`❌ Internshala failed: ${e.message}`);
       }
    } else {
       console.log('Skipping Internshala as no "intern" keyword found.');
    }

    console.log('Scraping Apna...');
    try {
      const apnaJobs = await scrapeApna(keywords, location);
      console.log(`✅ Apna scraped ${apnaJobs.length} jobs.`);
      allJobs.push(...apnaJobs);
    } catch (e: any) {
      console.error(`❌ Apna failed: ${e.message}`);
    }

    console.log('Scraping Unstop...');
    try {
      const unstopJobs = await scrapeUnstop(keywords, location);
      console.log(`✅ Unstop scraped ${unstopJobs.length} jobs.`);
      allJobs.push(...unstopJobs);
    } catch (e: any) {
      console.error(`❌ Unstop failed: ${e.message}`);
    }

    console.log('Scraping YCombinator...');
    try {
      const ytcJobs = await scrapeYCombinator(keywords, location);
      console.log(`✅ YCombinator scraped ${ytcJobs.length} jobs.`);
      allJobs.push(...ytcJobs);
    } catch (e: any) {
      console.error(`❌ YCombinator failed: ${e.message}`);
    }

    console.log('Scraping Wellfound...');
    try {
      const wfJobs = await scrapeWellfound(keywords, location);
      console.log(`✅ Wellfound scraped ${wfJobs.length} jobs.`);
      allJobs.push(...wfJobs);
    } catch (e: any) {
      console.error(`❌ Wellfound failed: ${e.message}`);
    }

    await notifyAPI(allJobs, user.id);

  } catch (error) {
    console.error('❌ Error during scraping run:', error);
  } finally {
    console.log(`[${new Date().toISOString()}] 🏁 Scraper Job Finished.\n`);
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
