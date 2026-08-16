import * as cheerio from 'cheerio';

// A mock HTML string that looks like a simplified version of LinkedIn's structure
const mockHtml = `
  <ul class="jobs-search__results-list">
    <li>
      <h3 class="base-search-card__title">Software Engineer</h3>
      <h4 class="base-search-card__subtitle">Google</h4>
      <span class="job-search-card__location">Remote</span>
      <a class="base-card__full-link" href="https://linkedin.com/job/123?tracking=xyz">Link</a>
    </li>
  </ul>
`;

describe('LinkedIn Scraper Parsing', () => {
  it('should correctly parse job listings from HTML', () => {
    const $ = cheerio.load(mockHtml);
    const jobs: any[] = [];

    $('.jobs-search__results-list li').each((_, element) => {
      const title = $(element).find('.base-search-card__title').text().trim();
      const company = $(element).find('.base-search-card__subtitle').text().trim();
      const loc = $(element).find('.job-search-card__location').text().trim();
      const jobUrl = $(element).find('a.base-card__full-link').attr('href') || '';

      if (title && company && jobUrl) {
        jobs.push({
          title,
          company,
          location: loc,
          url: jobUrl.split('?')[0], // strip tracking params
          source: 'LinkedIn'
        });
      }
    });

    expect(jobs.length).toBe(1);
    expect(jobs[0].title).toBe('Software Engineer');
    expect(jobs[0].company).toBe('Google');
    expect(jobs[0].location).toBe('Remote');
    expect(jobs[0].url).toBe('https://linkedin.com/job/123'); // Tracking param removed
  });
});
