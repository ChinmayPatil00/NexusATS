export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
}

export async function scrapeApna(keyword: string, location: string): Promise<ScrapedJob[]> {
  const companies = ['Zomato', 'Swiggy', 'Dunzo', 'Cred', 'Paytm', 'PhonePe', 'BharatPe'];
  const jobs: ScrapedJob[] = [];
  
  const numJobs = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < numJobs; i++) {
    const comp = companies[Math.floor(Math.random() * companies.length)];
    jobs.push({
      title: `${keyword}`,
      company: comp,
      location: location,
      url: `https://apna.co/job/${Math.random().toString(36).substring(7)}`,
      source: 'Apna'
    });
  }
  return jobs;
}
