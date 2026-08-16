"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const cheerio = __importStar(require("cheerio"));
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
        const jobs = [];
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
//# sourceMappingURL=linkedin.test.js.map