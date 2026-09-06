"use client";
import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Target, Activity } from 'lucide-react';

import { jobApi, Job } from '@/lib/api';
import { useUser } from '@clerk/nextjs';

export default function AnalyticsPage() {
  const { user } = useUser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    jobApi.getJobs(user?.id)
      .then(data => {
        if (Array.isArray(data)) setJobs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch jobs:", err);
        setLoading(false);
      });
  }, [user?.id]);

  const totalJobs = jobs.length;
  const appliedJobs = jobs.filter(j => ['APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED'].includes(j.state)).length;
  const interviewingJobs = jobs.filter(j => ['INTERVIEWING', 'OFFER'].includes(j.state)).length;
  const offers = jobs.filter(j => j.state === 'OFFER').length;

  const conversionRate = totalJobs > 0 ? ((appliedJobs / totalJobs) * 100).toFixed(1) : "0";
  const interviewRate = appliedJobs > 0 ? ((interviewingJobs / appliedJobs) * 100).toFixed(1) : "0";

  // Source Distribution
  const sources = jobs.reduce((acc, job) => {
    acc[job.source] = (acc[job.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar">
      <header className="flex-none px-4 sm:px-8 py-6 border-b border-[var(--border-subtle)] bg-[var(--surface)]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-main)] tracking-tight flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-indigo-400" />
              Pipeline Analytics
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">Visualize your job search performance and scraper activity.</p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
          
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Activity className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* Top Metrics Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <MetricCard title="Total Scraped" value={totalJobs} icon={Target} color="text-indigo-400" bg="bg-indigo-500/10" />
                <MetricCard title="Applications Sent" value={appliedJobs} icon={TrendingUp} color="text-yellow-400" bg="bg-yellow-500/10" />
                <MetricCard title="Interviews Secured" value={interviewingJobs} icon={Users} color="text-indigo-400" bg="bg-indigo-500/10" />
                <MetricCard title="Offers Received" value={offers} icon={Activity} color="text-cyan-400" bg="bg-cyan-500/10" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Funnel Conversion */}
                <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-3xl p-5 sm:p-8 shadow-sm">
                  <h3 className="text-lg font-bold text-[var(--text-main)] mb-6">Funnel Conversion</h3>
                  
                  <div className="space-y-6">
                    <div className="relative">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[var(--text-secondary)]">Apply Rate (Scraped → Applied)</span>
                        <span className="font-bold text-indigo-400">{conversionRate}%</span>
                      </div>
                      <div className="h-3 w-full bg-[var(--overlay)] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full" 
                          style={{ width: `${Math.min(100, Number(conversionRate))}%` }} 
                        />
                      </div>
                    </div>

                    <div className="relative">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[var(--text-secondary)]">Interview Rate (Applied → Interviewing)</span>
                        <span className="font-bold text-purple-400">{interviewRate}%</span>
                      </div>
                      <div className="h-3 w-full bg-[var(--overlay)] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full" 
                          style={{ width: `${Math.min(100, Number(interviewRate))}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Source Distribution */}
                <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-3xl p-5 sm:p-8 shadow-sm">
                  <h3 className="text-lg font-bold text-[var(--text-main)] mb-6">Scraper Source Distribution</h3>
                  <div className="space-y-4">
                    {Object.entries(sources).length === 0 ? (
                      <p className="text-[var(--text-muted)] text-sm">No jobs scraped yet.</p>
                    ) : (
                      Object.entries(sources)
                        .sort((a, b) => b[1] - a[1])
                        .map(([source, count]) => {
                          const percentage = totalJobs > 0 ? ((count / totalJobs) * 100).toFixed(1) : "0";
                          return (
                            <div key={source} className="flex items-center gap-3 sm:gap-4">
                              <span className="w-20 sm:w-24 shrink-0 text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider truncate">{source}</span>
                              <div className="flex-1 h-2 bg-[var(--overlay)] rounded-full overflow-hidden flex">
                                <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${percentage}%` }} />
                              </div>
                              <span className="w-12 text-right text-xs text-[var(--text-muted)] font-medium">{percentage}%</span>
                            </div>
                          );
                      })
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color, bg }: { title: string, value: number | string, icon: React.ElementType, color: string, bg: string }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-6 flex flex-col justify-between shadow-sm">
      <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
        <h4 className="text-[var(--text-muted)] text-xs sm:text-sm font-medium">{title}</h4>
        <div className={`p-1.5 sm:p-2 rounded-lg ${bg} shrink-0`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color}`} />
        </div>
      </div>
      <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--text-main)] tracking-tighter">{value}</span>
    </div>
  );
}
