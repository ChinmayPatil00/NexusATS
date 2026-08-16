"use client";

import { useEffect, useState, useMemo } from "react";
import { Job, jobApi } from "@/lib/api";
import { Search, Loader2, MapPin, Building2, ExternalLink, Sparkles, Filter, Rocket } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import CustomSelect from "@/components/CustomSelect";

export default function StartupsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState<string>("ALL");
  const [filterPlatform, setFilterPlatform] = useState<string>("All Platforms");

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await jobApi.getJobs();
        setJobs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchJobs();
    const intervalId = setInterval(fetchJobs, 3000);
    
    return () => clearInterval(intervalId);
  }, []);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Platform filter
      if (filterPlatform !== "All Platforms" && job.source !== filterPlatform) return false;

      const matchesSearch = job.title.toLowerCase().includes(search.toLowerCase()) || 
                            job.company.toLowerCase().includes(search.toLowerCase());
      const matchesState = filterState === "ALL" || job.state === filterState;
      return matchesSearch && matchesState;
    }).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }, [jobs, search, filterState, filterPlatform]);

  const getMatchColor = (score?: number) => {
    if (score === undefined) return 'text-gray-400';
    if (score >= 80) return 'text-orange-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMatchBg = (score?: number) => {
    if (score === undefined) return 'bg-gray-400';
    if (score >= 80) return 'bg-orange-400';
    if (score >= 50) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[80vh]">
        <div className="relative">
          <div className="absolute inset-0 blur-xl bg-orange-500/30 rounded-full animate-pulse" />
          <Loader2 className="w-10 h-10 animate-spin text-orange-500 relative z-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden bg-[var(--background)] transition-colors relative custom-scrollbar">
      {/* Background Decorative Blobs - Startup colors (Orange/Red) */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Header Section */}
      <header className="px-4 md:px-8 py-8 border-b border-[var(--border-subtle)] bg-[var(--surface)]/40 backdrop-blur-2xl relative z-50 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-[var(--text-main)] tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              Discover Startups
            </h1>
            <p className="text-sm md:text-base text-[var(--text-muted)] mt-3 font-medium ml-14">
              Exclusive startup roles sourced from all platforms, including YC, Wellfound, Apna, and more.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-[var(--surface)] border border-[var(--border-strong)] p-2 rounded-xl shadow-sm">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input 
                type="text" 
                placeholder="Search startups..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent border-none pl-9 pr-4 py-1.5 text-sm font-semibold text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-0"
              />
            </div>
            <div className="hidden sm:block w-px h-6 bg-[var(--border-strong)] mx-1" />
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative w-full sm:w-auto flex items-center">
                <Rocket className="absolute left-3 w-4 h-4 text-[var(--text-muted)] pointer-events-none z-10" />
                <CustomSelect 
                  value={filterPlatform}
                  options={["All Platforms", "YCombinator", "Wellfound", "Apna", "Unstop", "LinkedIn"]}
                  onChange={(val) => setFilterPlatform(val)}
                  className="pl-7"
                  dropdownClassName="w-40"
                />
              </div>
              <div className="hidden sm:block w-px h-4 bg-[var(--border-strong)] mx-1" />
              <div className="relative w-full sm:w-auto flex items-center">
                <Filter className="absolute left-3 w-4 h-4 text-[var(--text-muted)] pointer-events-none z-10" />
                <CustomSelect 
                  value={filterState === "ALL" ? "All Statuses" : filterState === "NEW" ? "New Match" : filterState === "SAVED" ? "Shortlisted" : filterState === "APPLIED" ? "Applied" : "Interviewing"}
                  options={["All Statuses", "New Match", "Shortlisted", "Applied", "Interviewing"]}
                  onChange={(val) => {
                    if (val === "All Statuses") setFilterState("ALL");
                    else if (val === "New Match") setFilterState("NEW");
                    else if (val === "Shortlisted") setFilterState("SAVED");
                    else if (val === "Applied") setFilterState("APPLIED");
                    else setFilterState("INTERVIEWING");
                  }}
                  className="pl-7"
                  dropdownClassName="w-48"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Section */}
      <main className="flex-1 p-4 md:p-8 relative z-10 max-w-7xl mx-auto w-full">
        {filteredJobs.length === 0 ? (
          <div className="h-full min-h-[40vh] flex flex-col items-center justify-center p-8 border-2 border-dashed border-[var(--border-subtle)] rounded-3xl bg-[var(--surface)]/40 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-full bg-[var(--overlay)] flex items-center justify-center mb-4 border border-[var(--border-subtle)]">
              <Rocket className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <p className="text-[var(--text-secondary)] font-medium text-lg">No startup jobs found</p>
            <p className="text-[var(--text-muted)] text-sm mt-2 text-center max-w-[300px]">
              Make sure your Target preferences are saved, or trigger the AI scraper.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
            <AnimatePresence>
              {filteredJobs.map((job, idx) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 > 0.5 ? 0 : idx * 0.05 }}
                  className="group relative bg-[var(--surface)]/60 backdrop-blur-xl border border-[var(--border-subtle)] hover:border-orange-500/50 p-6 rounded-3xl transition-all duration-300 flex flex-col h-[280px] overflow-hidden hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(249,115,22,0.3)]"
                >
                  {/* Decorative Glow inside card */}
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-orange-500/10 to-red-500/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                  {/* Status Badge */}
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-bl-2xl bg-[var(--overlay)] text-[var(--text-secondary)] border-b border-l border-[var(--border-subtle)] shadow-sm">
                    {job.state}
                  </span>

                  <div className="flex flex-col h-full relative z-10">
                    <div className="pr-16 mb-4">
                      <Link href={`/job/${job.id}`} className="block">
                        <h2 className="font-extrabold text-[var(--text-main)] text-xl leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-orange-400 group-hover:to-red-400 transition-all line-clamp-2">
                          {job.title}
                        </h2>
                      </Link>
                    </div>

                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2.5 text-sm font-semibold text-[var(--text-secondary)]">
                        <Building2 className="w-4 h-4 text-orange-400 shrink-0" />
                        <span className="truncate">{job.company}</span>
                      </div>
                      
                      {job.location && job.location.toLowerCase() !== 'unknown' && (
                        <div className="flex items-center gap-2.5 text-xs font-medium text-[var(--text-muted)]">
                          <MapPin className="w-4 h-4 text-red-400 shrink-0" />
                          <span className="truncate">{job.location}</span>
                        </div>
                      )}

                      {/* Source tag */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider ${job.source === 'YCombinator' ? 'bg-[#ff6600]/10 border-[#ff6600]/20 text-[#ff6600]' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                          {job.source}
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between gap-4">
                      {job.matchScore !== undefined ? (
                        <div className="flex items-center gap-2 w-full">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br ${job.matchScore >= 80 ? 'from-orange-500/20 to-orange-500/5 text-orange-400 border border-orange-500/30' : job.matchScore >= 50 ? 'from-yellow-500/20 to-yellow-500/5 text-yellow-400 border border-yellow-500/30' : 'from-red-500/20 to-red-500/5 text-red-400 border border-red-500/30'}`}>
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col w-full pr-2">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${getMatchColor(job.matchScore)}`}>
                              AI Match
                            </span>
                            <div className="h-1.5 w-full bg-[var(--overlay)] rounded-full mt-1 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-1000 ${getMatchBg(job.matchScore)}`} style={{ width: `${job.matchScore}%` }} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                          Pending AI Score
                        </div>
                      )}

                      <Link 
                        href={`/job/${job.id}`}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--overlay)] hover:bg-orange-500 text-[var(--text-main)] hover:text-white transition-colors shrink-0 group/btn"
                        title="View Details"
                      >
                        <ExternalLink className="w-4 h-4 transition-transform group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
