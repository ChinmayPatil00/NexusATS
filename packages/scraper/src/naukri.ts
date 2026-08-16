import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { ScrapedJob } from './linkedin';

export async function scrapeNaukri(keyword: string, location: string): Promise<ScrapedJob[]> {
  const formattedKeyword = keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const formattedLocation = location.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const url = `https://www.naukri.com/${formattedKeyword}-jobs-in-${formattedLocation}`;
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Fake user agent to avoid basic blocks
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const content = await page.content();
    const $ = cheerio.load(content);
    const jobs: ScrapedJob[] = [];

    // Naukri typically uses article with class 'jobTuple' or a div with class 'srp-jobtuple-wrapper'
    const jobElements = $('.srp-jobtuple-wrapper, article.jobTuple');
    
    jobElements.each((_, element) => {
      const title = $(element).find('.title').text().trim() || $(element).find('a.title').text().trim();
      const company = $(element).find('.comp-name').text().trim() || $(element).find('a.subTitle').text().trim();
      const loc = $(element).find('.locWdth').text().trim() || $(element).find('.locWrap').text().trim();
      const jobUrl = $(element).find('a.title').attr('href') || '';

      if (title && company && jobUrl) {
        jobs.push({
          title,
          company,
          location: loc || location,
          url: jobUrl,
          source: 'Naukri' as any
        });
      }
    });
    
    await browser.close();
    return jobs;
  } catch (error) {
    console.error("Naukri scraping failed:", error);
    await browser.close();
    return [];
  }
}
