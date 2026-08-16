"use client";

import React, { useState, useEffect, use } from 'react';
import { Target, CheckSquare, MessageSquare, Video, ArrowLeft, Loader2, ExternalLink, CheckCircle2, Sparkles, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { jobApi, Job } from '@/lib/api';


export default function InterviewPrepPage({ params }: { params: Promise<{ id: string }> }) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const { id } = use(params);
  
  const generateQuestions = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/jobs/${id}/interview`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok && data.questions) {
        setQuestions(data.questions);
      } else {
        alert(data.error || "Failed to generate questions");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    jobApi.getJob(id)
      .then(data => {
        setJob(data);
        setLoading(false);
        // Optionally auto-generate questions on first load if none exist
        // But for UX, we'll let them click the button or trigger it
      })
      .catch(err => {
        console.error("Failed to fetch job:", err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!job) return <div>Job Not Found</div>;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--background)] transition-colors">
      <div className="max-w-5xl mx-auto py-8 px-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href={`/job/${id}`} className="p-2 bg-[var(--overlay)] hover:bg-[var(--overlay-hover)] rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)]">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-2">
                <Video className="w-6 h-6 text-indigo-500 dark:text-indigo-400" /> Interview Prep Workspace
              </h1>
              <p className="text-sm text-[var(--text-muted)]">Preparing for {job.title} at {job.company}</p>
            </div>
          </div>
          <a href={job.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-semibold text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300">
            View Job Details <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content - AI Questions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-3xl p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                  <Target className="w-5 h-5 text-cyan-500 dark:text-cyan-400" /> Targeted AI Questions
                </h2>
                
                <button 
                  onClick={generateQuestions}
                  disabled={generating}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-500/20"
                >
                  {generating ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Generate Questions</>
                  )}
                </button>
              </div>
              
              <div className="space-y-6">
                {questions.length === 0 && !generating && (
                  <div className="py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-[var(--border-subtle)] rounded-2xl bg-[var(--overlay)]">
                    <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mb-4">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text-main)] mb-1">Generate Targeted Questions</h3>
                    <p className="text-[var(--text-muted)] text-sm max-w-sm">
                      Our AI will analyze the job description and your resume to generate the most likely questions you will face.
                    </p>
                  </div>
                )}
                
                {questions.length > 0 && questions.map((q, idx) => (
                  <div key={idx} className="bg-[var(--overlay)] border border-[var(--border-subtle)] rounded-2xl p-6">
                    <p className="font-medium text-[var(--text-secondary)] mb-4">{idx + 1}. {q}</p>
                    <textarea 
                      placeholder="Draft your STAR method response here..."
                      className="w-full bg-[var(--background)] border border-[var(--border-strong)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500 min-h-[100px] resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar - Checklist & Scratchpad */}
          <div className="space-y-6">
            <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-3xl p-6 shadow-sm">
              <h3 className="text-md font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-cyan-500 dark:text-cyan-400" /> Prep Checklist
              </h3>
              <div className="space-y-3">
                {['Research company values', 'Review recent press releases', 'Find interviewer on LinkedIn', 'Prepare 3 questions to ask them', 'Test audio/video setup'].map((item, idx) => (
                  <label key={idx} className="flex items-center gap-3 cursor-pointer group">
                    <div className="w-5 h-5 rounded border border-[var(--text-muted)] flex items-center justify-center group-hover:border-indigo-500 transition-colors">
                      <input type="checkbox" className="hidden peer" />
                      <CheckCircle2 className="w-4 h-4 text-cyan-500 dark:text-cyan-400 opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-main)] transition-colors">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-3xl p-6 flex flex-col h-[400px] shadow-sm">
              <h3 className="text-md font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-500 dark:text-purple-400" /> Live Interview Notes
              </h3>
              <textarea 
                placeholder="Jot down notes during the interview here..."
                className="flex-1 w-full bg-[var(--background)] border border-[var(--border-strong)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
