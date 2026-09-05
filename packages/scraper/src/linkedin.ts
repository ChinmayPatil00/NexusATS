import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  url: string;
  source: 'LinkedIn' | 'Indeed' | 'Naukri' | 'Internshala' | 'Apna' | 'Unstop' | 'YCombinator' | 'Wellfound' | string;
}

export async function scrapeLinkedIn(keyword: string, location: string): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];
  const searchKeywords = encodeURIComponent(keyword);
  const searchLocation = encodeURIComponent(location);

  // Strategy 1: Ultra-fast direct fetch (~700ms)
  try {
    const urls = [
      `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${searchKeywords}&location=${searchLocation}&start=0`,
      `https://www.linkedin.com/jobs/search?keywords=${searchKeywords}&location=${searchLocation}`
    ];

    for (const fetchUrl of urls) {
      const res = await fetch(fetchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(5000)
      });

      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);

        $('.jobs-search__results-list li, li:has(.base-card)').each((_, element) => {
          const title = $(element).find('.base-search-card__title').text().trim();
          const company = $(element).find('.base-search-card__subtitle').text().trim();
          const loc = $(element).find('.job-search-card__location').text().trim();
          const jobUrl = $(element).find('a.base-card__full-link, a').attr('href') || '';

          if (title && company && jobUrl && jobUrl.includes('/jobs/view/')) {
            const cleanUrl = jobUrl.split('?')[0];
            if (!jobs.some(j => j.url === cleanUrl)) {
              jobs.push({
                title,
                company,
                location: loc || location,
                url: cleanUrl,
                source: 'LinkedIn'
              });
            }
          }
        });

        if (jobs.length > 0) {
          console.log(`[LinkedIn] Fast fetch harvested ${jobs.length} jobs directly!`);
          return jobs;
        }
      }
    }
  } catch (err: any) {
    console.warn(`[LinkedIn] Fast fetch skipped (${err.message}), falling back to browser...`);
  }

  // Strategy 2: Fast Puppeteer fallback (aborts images/fonts/media, 10s timeout)
  let browser: any = null;
  try {
    const url = `https://www.linkedin.com/jobs/search?keywords=${searchKeywords}&location=${searchLocation}`;
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

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
    const content = await page.content();
    const $ = cheerio.load(content);

    $('.jobs-search__results-list li').each((_, element) => {
      const title = $(element).find('.base-search-card__title').text().trim();
      const company = $(element).find('.base-search-card__subtitle').text().trim();
      const loc = $(element).find('.job-search-card__location').text().trim();
      const jobUrl = $(element).find('a.base-card__full-link').attr('href') || '';

      if (title && company && jobUrl) {
        const cleanUrl = jobUrl.split('?')[0];
        if (!jobs.some(j => j.url === cleanUrl)) {
          jobs.push({
            title,
            company,
            location: loc || location,
            url: cleanUrl,
            source: 'LinkedIn'
          });
        }
      }
    });
  } catch (error: any) {
    console.error(`[LinkedIn] Browser fallback error: ${error.message}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  return jobs;
}

