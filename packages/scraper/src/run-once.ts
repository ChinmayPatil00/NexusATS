import { scrapeLinkedIn } from './linkedin';
import { scrapeIndeed } from './indeed';

async function testRun() {
  console.log(`[${new Date().toISOString()}] 🚀 Starting Single Test Scrape...`);
  
  const keywords = 'Software Engineer';
  const location = 'Remote';

  try {
    console.log(`\n🔍 Scraping LinkedIn for "${keywords}" in "${location}"...`);
    const linkedInJobs = await scrapeLinkedIn(keywords, location);
    console.log(`✅ LinkedIn scraped ${linkedInJobs.length} jobs.`);
    
    console.log(`\n🔍 Scraping Indeed for "${keywords}" in "${location}"...`);
    const indeedJobs = await scrapeIndeed(keywords, location);
    console.log(`✅ Indeed scraped ${indeedJobs.length} jobs.`);

    const allJobs = [...linkedInJobs, ...indeedJobs];
    console.log(`Found ${allJobs.length} total jobs.`);
  
    for (const job of allJobs) {
      try {
        await fetch('http://localhost:4000/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobTitle: job.title,
            company: job.company,
            url: job.url,
            source: job.source
          })
        });
      } catch (error) {
        console.error(`Failed to notify API for job: ${job.title}`, error);
      }
    }

    console.log(`\n🏁 Test Finished.`);

  } catch (error) {
    console.error('❌ Error during scraping run:', error);
  } finally {
    console.log(`\n[${new Date().toISOString()}] 🏁 Test Finished.`);
    process.exit(0);
  }
}

testRun();
