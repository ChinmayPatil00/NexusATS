export const API_URL = 'http://localhost:4000/api';

export type JobState = 'NEW' | 'SAVED' | 'APPLIED' | 'INTERVIEWING' | 'OFFER' | 'REJECTED';

export interface Note {
  id: string;
  text: string;
  createdAt: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  state: JobState;
  url: string;
  source: string;
  location?: string;
  matchScore?: number;
  matchRationale?: string;
  description?: string;
  salary?: string;
  createdAt: string;
  notes?: Note[];
}

export const jobApi = {
  getJobs: async (): Promise<Job[]> => {
    const res = await fetch('/api/jobs');
    if (!res.ok) throw new Error("Failed to fetch jobs");
    return res.json();
  },
  
  updateJobState: async ({ id, state }: { id: string, state: JobState }): Promise<Job> => {
    const res = await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state })
    });
    if (!res.ok) throw new Error("Failed to update job state");
    return res.json();
  },
  
  deleteJob: async (id: string): Promise<void> => {
    const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete job");
  },

  getJob: async (id: string): Promise<Job> => {
    // Next.js API route
    const res = await fetch(`/api/jobs/${id}`);
    if (!res.ok) throw new Error("Failed to fetch job");
    return res.json();
  },

  addNote: async (id: string, text: string): Promise<Note> => {
    const res = await fetch(`/api/jobs/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error("Failed to add note");
    return res.json();
  },

  generateCoverLetter: async (id: string): Promise<string> => {
    // Note: Calling the Express API directly because Next.js rewrite is /api/:path* -> http://localhost:4000/api/:path*
    const res = await fetch(`/api/jobs/${id}/cover-letter`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to generate cover letter");
    return data.coverLetter;
  }
};
