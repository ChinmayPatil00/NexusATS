import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  url: string;
  source: 'LinkedIn' | 'Indeed';
}

export async function scrapeLinkedIn(keyword: string, location: string): Promise<ScrapedJob[]> {
  const url = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}`;
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto(url, { waitUntil: 'networkidle2' });
  
  // Get full HTML
  const content = await page.content();
  await browser.close();

  const $ = cheerio.load(content);
  const jobs: ScrapedJob[] = [];

  $('.jobs-search__results-list li').each((_, element) => {
    const title = $(element).find('.base-search-card__title').text().trim();
    const company = $(element).find('.base-search-card__subtitle').text().trim();
    const loc = $(element).find('.job-search-card__location').text().trim();
    const jobUrl = $(element).find('a.base-card__full-link').attr('href') || '';

    if (title && company && jobUrl) {
      // Clean up the URL to remove tracking parameters
      const cleanUrl = jobUrl.split('?')[0];
      
      jobs.push({
        title,
        company,
        location: loc || location,
        url: cleanUrl,
        source: 'LinkedIn'
      });
    }
  });

  return jobs;
}
