"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const linkedin_1 = require("./linkedin");
const indeed_1 = require("./indeed");
// Helper to notify the API when new jobs are found
async function notifyAPI(jobs) {
    if (jobs.length === 0)
        return;
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
                    location: job.location || "Unknown"
                })
            });
        }
        catch (err) {
            console.error('Failed to notify API for job:', job.title);
        }
    }
}
const naukri_1 = require("./naukri");
const internshala_1 = require("./internshala");
const database_1 = require("@job-aggregator-ats/database");
async function runAllScrapers() {
    console.log(`[${new Date().toISOString()}] 🚀 Starting Scraper Job...`);
    try {
        const user = await database_1.prisma.user.findFirst();
        if (!user) {
            console.log('No user found in DB. Exiting.');
            return;
        }
        let keywordsArray = ['Software Engineer'];
        let locationsArray = ['Remote'];
        try {
            keywordsArray = JSON.parse(user.keywords);
            locationsArray = JSON.parse(user.locations);
        }
        catch (e) {
            console.error('Failed to parse user preferences from DB', e);
        }
        // We just take the first preference for now for simplicity,
        // or we could loop over all of them.
        const keywords = keywordsArray[0] || 'Software Engineer';
        const location = locationsArray[0] || 'Remote';
        console.log(`Using preferences -> Role: ${keywords}, Location: ${location}`);
        console.log('Scraping LinkedIn...');
        const linkedInJobs = await (0, linkedin_1.scrapeLinkedIn)(keywords, location);
        console.log(`✅ LinkedIn scraped ${linkedInJobs.length} jobs.`);
        console.log('Scraping Indeed...');
        const indeedJobs = await (0, indeed_1.scrapeIndeed)(keywords, location);
        console.log(`✅ Indeed scraped ${indeedJobs.length} jobs.`);
        console.log('Scraping Naukri...');
        const naukriJobs = await (0, naukri_1.scrapeNaukri)(keywords, location);
        console.log(`✅ Naukri scraped ${naukriJobs.length} jobs.`);
        let internshalaJobs = [];
        if (keywords.toLowerCase().includes('intern') || keywordsArray.some((k) => k.toLowerCase().includes('intern'))) {
            console.log('Scraping Internshala...');
            internshalaJobs = await (0, internshala_1.scrapeInternshala)(keywords, location);
            console.log(`✅ Internshala scraped ${internshalaJobs.length} jobs.`);
        }
        else {
            console.log('Skipping Internshala as no "intern" keyword found.');
        }
        const allJobs = [...linkedInJobs, ...indeedJobs, ...naukriJobs, ...internshalaJobs];
        await notifyAPI(allJobs);
    }
    catch (error) {
        console.error('❌ Error during scraping run:', error);
    }
    finally {
        console.log(`[${new Date().toISOString()}] 🏁 Scraper Job Finished.\n`);
    }
}
// ==========================================
// CRON SCHEDULE
// ==========================================
// Run at 08:00 AM every morning (0 8 * * *)
// For testing purposes, we'll set it to run every 5 minutes (*/5 * * * *)
const SCHEDULE = '*/5 * * * *';
console.log(`Setting up Scraper Cron Job with schedule: ${SCHEDULE}`);
node_cron_1.default.schedule(SCHEDULE, () => {
    runAllScrapers();
});
// Run it once immediately on startup
runAllScrapers();
//# sourceMappingURL=index.js.map