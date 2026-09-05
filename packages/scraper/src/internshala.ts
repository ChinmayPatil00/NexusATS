import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { ScrapedJob } from './linkedin';

export async function scrapeInternshala(keyword: string, location: string): Promise<ScrapedJob[]> {
  const formattedKeyword = encodeURIComponent(keyword.toLowerCase().replace(/\s+/g, '-'));
  const url = `https://internshala.com/internships/keywords-${formattedKeyword}/`;
  const jobs: ScrapedJob[] = [];

  // Strategy 1: Ultra-fast direct fetch (~1.2s)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(5000)
    });

    if (res.ok) {
      const content = await res.text();
      const $ = cheerio.load(content);

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
            location: loc || location || 'Remote',
            url: jobUrl.split('?')[0],
            source: 'Internshala' as any
          });
        }
      });

      if (jobs.length > 0) {
        console.log(`[Internshala] Direct fetch scraped ${jobs.length} internships!`);
        return jobs;
      }
    }
  } catch (err: any) {
    console.warn(`[Internshala] Direct fetch skipped (${err.message}), falling back to browser...`);
  }

  // Strategy 2: Fast Puppeteer fallback (aborts images/fonts, 10s timeout)
  let browser: any = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (req: any) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
    const content = await page.content();
    const $ = cheerio.load(content);

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
          location: loc || location || 'Remote',
          url: jobUrl.split('?')[0],
          source: 'Internshala' as any
        });
      }
    });
  } catch (error: any) {
    console.error(`[Internshala] Browser fallback error: ${error.message}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  return jobs;
}

