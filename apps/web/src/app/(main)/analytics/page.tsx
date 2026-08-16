"use client";
import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Target, Activity } from 'lucide-react';

import { jobApi, Job } from '@/lib/api';

export default function AnalyticsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    jobApi.getJobs()
      .then(data => {
        if (Array.isArray(data)) setJobs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch jobs:", err);
        setLoading(false);
      });
  }, []);

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
      <header className="flex-none px-8 py-6 border-b border-[var(--border-subtle)] bg-[var(--surface)]/80 backdrop-blur-xl">
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

      <div className="flex-1 p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Activity className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* Top Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard title="Total Scraped" value={totalJobs} icon={Target} color="text-indigo-400" bg="bg-indigo-500/10" />
                <MetricCard title="Applications Sent" value={appliedJobs} icon={TrendingUp} color="text-yellow-400" bg="bg-yellow-500/10" />
                <MetricCard title="Interviews Secured" value={interviewingJobs} icon={Users} color="text-indigo-400" bg="bg-indigo-500/10" />
                <MetricCard title="Offers Received" value={offers} icon={Activity} color="text-cyan-400" bg="bg-cyan-500/10" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Funnel Conversion */}
                <div className="bg-[#121214] border border-white/5 rounded-3xl p-8">
                  <h3 className="text-lg font-bold text-white mb-6">Funnel Conversion</h3>
                  
                  <div className="space-y-6">
                    <div className="relative">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Apply Rate (Scraped → Applied)</span>
                        <span className="font-bold text-indigo-400">{conversionRate}%</span>
                      </div>
                      <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full" 
                          style={{ width: `${Math.min(100, Number(conversionRate))}%` }} 
                        />
                      </div>
                    </div>

                    <div className="relative">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Interview Rate (Applied → Interviewing)</span>
                        <span className="font-bold text-purple-400">{interviewRate}%</span>
                      </div>
                      <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full" 
                          style={{ width: `${Math.min(100, Number(interviewRate))}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Source Distribution */}
                <div className="bg-[#121214] border border-white/5 rounded-3xl p-8">
                  <h3 className="text-lg font-bold text-white mb-6">Scraper Source Distribution</h3>
                  <div className="space-y-4">
                    {Object.entries(sources).length === 0 ? (
                      <p className="text-gray-500 text-sm">No jobs scraped yet.</p>
                    ) : (
                      Object.entries(sources)
                        .sort((a, b) => b[1] - a[1])
                        .map(([source, count]) => {
                          const percentage = totalJobs > 0 ? ((count / totalJobs) * 100).toFixed(1) : "0";
                          return (
                            <div key={source} className="flex items-center gap-4">
                              <span className="w-24 shrink-0 text-sm font-semibold text-gray-300 uppercase tracking-wider">{source}</span>
                              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden flex">
                                <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${percentage}%` }} />
                              </div>
                              <span className="w-12 text-right text-xs text-gray-500 font-medium">{percentage}%</span>
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
    <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
      <div className="flex items-start justify-between mb-4">
        <h4 className="text-gray-400 text-sm font-medium">{title}</h4>
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      <span className="text-4xl font-black text-white tracking-tighter">{value}</span>
    </div>
  );
}
