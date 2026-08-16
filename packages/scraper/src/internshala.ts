import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { ScrapedJob } from './linkedin';

export async function scrapeInternshala(keyword: string, location: string): Promise<ScrapedJob[]> {
  const formattedKeyword = encodeURIComponent(keyword);
  // Internshala doesn't strictly support combined location and keyword in the simple URL path easily without using their specific location tags.
  // We'll search by keyword and try to filter in UI or grab whatever is there.
  const url = `https://internshala.com/internships/keywords-${formattedKeyword}/`;
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const content = await page.content();
    const $ = cheerio.load(content);
    const jobs: ScrapedJob[] = [];

    $('.individual_internship').each((_, element) => {
      const title = $(element).find('.profile a').text().trim() || $(element).find('.job-title-href').text().trim();
      const company = $(element).find('.company_name a').text().trim() || $(element).find('.company-name').text().trim();
      const loc = $(element).find('.location_link').text().trim() || $(element).find('.locations').text().trim();
      let jobUrl = $(element).find('.profile a').attr('href') || $(element).find('.job-title-href').attr('href') || '';
      
      if (jobUrl && !jobUrl.startsWith('http')) {
        jobUrl = `https://internshala.com${jobUrl}`;
      }

      if (title && company && jobUrl) {
        jobs.push({
          title,
          company,
          location: loc || 'Remote', // fallback
          url: jobUrl,
          source: 'Internshala' as any
        });
      }
    });
    
    await browser.close();
    return jobs;
  } catch (error) {
    console.error("Internshala scraping failed:", error);
    await browser.close();
    return [];
  }
}
