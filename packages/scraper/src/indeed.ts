import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import { ScrapedJob } from './linkedin';

puppeteer.use(StealthPlugin());

export async function scrapeIndeed(keyword: string, location: string): Promise<ScrapedJob[]> {
  const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(keyword)}&l=${encodeURIComponent(location)}`;
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Indeed often has a popup or requires waiting for the job list
    await page.waitForSelector('#mosaic-provider-jobcards', { timeout: 15000 }).catch(() => {
      console.log('Indeed job cards container not found or timeout.');
    });

    const content = await page.content();
    const $ = cheerio.load(content);
    const jobs: ScrapedJob[] = [];

    $('.job_seen_beacon').each((_, element) => {
      const titleEl = $(element).find('h2.jobTitle span[title]');
      const title = titleEl.text().trim();
      
      const company = $(element).find('[data-testid="company-name"]').text().trim();
      const loc = $(element).find('[data-testid="text-location"]').text().trim();
      
      const relativeUrl = $(element).find('h2.jobTitle a').attr('href') || '';
      let jobUrl = '';
      if (relativeUrl) {
        const cleanUrl = relativeUrl.split('?')[0];
        jobUrl = `https://www.indeed.com${cleanUrl}`;
      }

      if (title && company && jobUrl) {
        jobs.push({
          title,
          company,
          location: loc,
          url: jobUrl,
          source: 'Indeed'
        });
      }
    });

    await browser.close();
    return jobs;
  } catch (error) {
    console.error('Error scraping Indeed:', error);
    await browser.close();
    return [];
  }
}
