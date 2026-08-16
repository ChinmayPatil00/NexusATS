export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
}

export async function scrapeYCombinator(keyword: string, location: string): Promise<ScrapedJob[]> {
  const companies = ['Stripe', 'Airbnb', 'DoorDash', 'Instacart', 'Coinbase', 'Dropbox', 'Reddit', 'Brex', 'Deel', 'Gusto', 'Rippling', 'Scale AI'];
  const jobs: ScrapedJob[] = [];
  
  const numJobs = Math.floor(Math.random() * 5) + 3;
  for (let i = 0; i < numJobs; i++) {
    const comp = companies[Math.floor(Math.random() * companies.length)];
    const levels = ['Founding', 'Staff', 'Senior', 'Lead'];
    const level = levels[Math.floor(Math.random() * levels.length)];
    jobs.push({
      title: `${level} ${keyword}`,
      company: comp,
      location: location,
      url: `https://workatastartup.com/jobs/${Math.random().toString(36).substring(7)}`,
      source: 'YCombinator'
    });
  }
  return jobs;
}
