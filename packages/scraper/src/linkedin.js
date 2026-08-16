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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeLinkedIn = scrapeLinkedIn;
const puppeteer_1 = __importDefault(require("puppeteer"));
const cheerio = __importStar(require("cheerio"));
async function scrapeLinkedIn(keyword, location) {
    const url = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}`;
    const browser = await puppeteer_1.default.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    // Get full HTML
    const content = await page.content();
    await browser.close();
    const $ = cheerio.load(content);
    const jobs = [];
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
//# sourceMappingURL=linkedin.js.map