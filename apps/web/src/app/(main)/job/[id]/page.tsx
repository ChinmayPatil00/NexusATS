"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Job, jobApi } from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, Building2, MapPin, ExternalLink, MessageSquarePlus, Loader2, Sparkles, Plus, Clock, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

export default function JobDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [letterError, setLetterError] = useState("");

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const data = await jobApi.getJob(id);
        setJob(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load job details. It might have been deleted or doesn't belong to you.");
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id]);


  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !job) return;
    
    setAddingNote(true);
    try {
      const added = await jobApi.addNote(job.id, newNote);
      setJob({ ...job, notes: [added, ...(job.notes || [])] });
      setNewNote("");
    } catch (err) {
      console.error("Failed to add note", err);
    } finally {
      setAddingNote(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!job) return;
    setGeneratingLetter(true);
    setLetterError("");
    try {
      const letter = await jobApi.generateCoverLetter(job.id);
      setCoverLetter(letter);
    } catch (err: unknown) {
      console.error("Cover Letter Error", err);
      setLetterError((err as Error).message || "Failed to generate cover letter.");
    } finally {
      setGeneratingLetter(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="p-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 max-w-md text-center">
          {error || "Job not found"}
        </div>
        <button onClick={() => router.back()} className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
          &larr; Go Back
        </button>
      </div>
    );
  }

  const getMatchColor = (score?: number) => {
    if (score === undefined) return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    if (score >= 80) return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    if (score >= 50) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/10 text-red-400 border-red-500/30';
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto w-full p-4 lg:p-6 overflow-hidden">
      <div className="flex items-center gap-4 shrink-0 mb-4">
        <button 
          onClick={() => router.back()}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-indigo-500/50 hover:bg-[var(--overlay)] transition-all text-[var(--text-secondary)] hover:text-[var(--text-main)]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Job Details</h1>
          <p className="text-sm text-[var(--text-muted)]">Manage notes and track your progress</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 overflow-hidden">
        
        {/* Left Pane */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6 pb-10">
          {/* Header Card */}
          <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-2xl p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] pointer-events-none" />
            
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6 relative z-10">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--overlay)] text-[var(--text-secondary)] text-xs font-black uppercase tracking-widest border border-[var(--border-subtle)]">
                {job.source}
              </span>
              
              {job.matchScore !== undefined && (
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${getMatchColor(job.matchScore)}`}>
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-bold">{job.matchScore}% AI Match</span>
                </div>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-main)] leading-tight mb-4 relative z-10">
              {job.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm sm:text-base font-medium text-[var(--text-secondary)] relative z-10">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                {job.company}
              </div>
              {job.location && job.location !== 'Unknown' && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-cyan-400" />
                  {job.location}
                </div>
              )}
              {job.salary && job.salary !== 'Not specified' && (
                <div className="flex items-center gap-2 text-cyan-400">
                  <span className="font-bold text-lg">$</span>
                  {job.salary}
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3 relative z-10 border-t border-[var(--border-subtle)] pt-6">
              <a 
                href={job.url} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]"
              >
                Apply Now <ExternalLink className="w-4 h-4" />
              </a>
              <Link
                href={`/interview/${job.id}`}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--overlay)] hover:bg-indigo-500/10 border border-[var(--border-subtle)] hover:border-indigo-500/50 text-[var(--text-main)] font-bold transition-all"
              >
                Prep for Interview <Sparkles className="w-4 h-4 text-indigo-400" />
              </Link>
              <div className="px-4 py-2.5 rounded-xl bg-[var(--overlay)] border border-[var(--border-subtle)] text-sm font-semibold text-[var(--text-muted)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                Status: <span className="text-[var(--text-main)]">{job.state}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {job.description && (
            <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                Job Description
              </h2>
              <div className="prose prose-invert max-w-none text-[var(--text-secondary)] whitespace-pre-wrap">
                {job.description}
              </div>
            </div>
          )}
        </div>

        {/* Right Pane (Sidebar) */}
        <div className="w-full lg:w-[400px] shrink-0 overflow-y-auto custom-scrollbar pr-2 space-y-6 pb-10">
          
          {/* AI Match Rationale */}
          {job.matchScore !== undefined && job.matchRationale && (
            <div className="bg-gradient-to-b from-indigo-500/10 to-transparent border border-indigo-500/30 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-indigo-400 mb-3 flex items-center gap-2 uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> AI Match Analysis
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {job.matchRationale}
              </p>
            </div>
          )}

          {/* AI Cover Letter Generator */}
          <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              Cover Letter
            </h2>
            
            {!coverLetter ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-[var(--text-muted)]">
                  Generate a tailored cover letter using your uploaded resume and this job description.
                </p>
                <button
                  onClick={handleGenerateCoverLetter}
                  disabled={generatingLetter}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {generatingLetter ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {generatingLetter ? 'Writing...' : 'Generate with AI'}
                </button>
                {letterError && (
                  <p className="text-xs text-red-400 mt-2">{letterError}</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  className="w-full h-64 bg-[var(--background)] border border-[var(--border-strong)] rounded-xl p-3 text-sm text-[var(--text-main)] custom-scrollbar resize-y focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(coverLetter)}
                  className="w-full inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[var(--overlay)] border border-[var(--border-strong)] text-[var(--text-main)] font-semibold text-sm hover:bg-[var(--overlay-hover)] transition-all"
                >
                  Copy to Clipboard
                </button>
              </div>
            )}
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <MessageSquarePlus className="w-5 h-5 text-indigo-400" />
              Notes
            </h2>
            
            <form onSubmit={handleAddNote} className="mb-6">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note (e.g. 'Interviewer name is Alex')"
                className="w-full bg-[var(--background)] border border-[var(--border-strong)] rounded-xl p-3 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none h-24"
              />
              <button
                type="submit"
                disabled={!newNote.trim() || addingNote}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white text-black font-bold text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Save Note
              </button>
            </form>

            <div className="space-y-4">
              {job.notes?.length === 0 ? (
                <div className="text-center py-6 text-sm text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-xl">
                  No notes yet.
                </div>
              ) : (
                job.notes?.map((note) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={note.id} 
                    className="p-4 rounded-xl bg-[var(--overlay)] border border-[var(--border-subtle)] text-sm"
                  >
                    <p className="text-[var(--text-main)] whitespace-pre-wrap">{note.text}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-2 font-medium flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
