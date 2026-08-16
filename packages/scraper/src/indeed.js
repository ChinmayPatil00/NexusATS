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
exports.scrapeIndeed = scrapeIndeed;
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const cheerio = __importStar(require("cheerio"));
const linkedin_1 = require("./linkedin");
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
async function scrapeIndeed(keyword, location) {
    const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(keyword)}&l=${encodeURIComponent(location)}`;
    const browser = await puppeteer_extra_1.default.launch({
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
        const jobs = [];
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
    }
    catch (error) {
        console.error('Error scraping Indeed:', error);
        await browser.close();
        return [];
    }
}
//# sourceMappingURL=indeed.js.map