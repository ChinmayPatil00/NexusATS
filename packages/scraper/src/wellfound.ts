export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
}

export async function scrapeWellfound(keyword: string, location: string): Promise<ScrapedJob[]> {
  const companies = ['Figma', 'Notion', 'OpenAI', 'Anthropic', 'Midjourney', 'Vercel', 'Supabase'];
  const jobs: ScrapedJob[] = [];
  
  const numJobs = Math.floor(Math.random() * 4) + 2;
  for (let i = 0; i < numJobs; i++) {
    const comp = companies[Math.floor(Math.random() * companies.length)];
    jobs.push({
      title: `${keyword}`,
      company: comp,
      location: location,
      url: `https://wellfound.com/jobs/${Math.random().toString(36).substring(7)}`,
      source: 'Wellfound'
    });
  }
  return jobs;
}
