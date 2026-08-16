export interface ScrapedJob {
    title: string;
    company: string;
    location: string;
    url: string;
    source: 'LinkedIn' | 'Indeed';
}
export declare function scrapeLinkedIn(keyword: string, location: string): Promise<ScrapedJob[]>;
//# sourceMappingURL=linkedin.d.ts.map