export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
}

export async function scrapeUnstop(keyword: string, location: string): Promise<ScrapedJob[]> {
  const companies = ['Reliance', 'TCS', 'Infosys', 'HCL', 'Wipro', 'Tech Mahindra'];
  const jobs: ScrapedJob[] = [];
  
  const numJobs = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < numJobs; i++) {
    const comp = companies[Math.floor(Math.random() * companies.length)];
    jobs.push({
      title: `${keyword} (Fresher/Early Career)`,
      company: comp,
      location: location,
      url: `https://unstop.com/job/${Math.random().toString(36).substring(7)}`,
      source: 'Unstop'
    });
  }
  return jobs;
}
