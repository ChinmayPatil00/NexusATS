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
exports.scrapeInternshala = scrapeInternshala;
const puppeteer_1 = __importDefault(require("puppeteer"));
const cheerio = __importStar(require("cheerio"));
const linkedin_1 = require("./linkedin");
async function scrapeInternshala(keyword, location) {
    const formattedKeyword = encodeURIComponent(keyword);
    // Internshala doesn't strictly support combined location and keyword in the simple URL path easily without using their specific location tags.
    // We'll search by keyword and try to filter in UI or grab whatever is there.
    const url = `https://internshala.com/internships/keywords-${formattedKeyword}/`;
    const browser = await puppeteer_1.default.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        const content = await page.content();
        const $ = cheerio.load(content);
        const jobs = [];
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
                    source: 'Internshala'
                });
            }
        });
        await browser.close();
        return jobs;
    }
    catch (error) {
        console.error("Internshala scraping failed:", error);
        await browser.close();
        return [];
    }
}
//# sourceMappingURL=internshala.js.map