"use client";

import React from 'react';
import Link from 'next/link';
import { Building2, MapPin, Calendar, Trash2, ExternalLink, ChevronRight } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { Job, JobState } from '@/lib/api';

interface JobCardProps {
  job: Job;
  deleteJob: (id: string) => void;
  getNextState: (state: JobState) => JobState | null;
  moveJob: (id: string, newState: JobState) => void;
  formatDate: (iso: string) => string;
}

export default function JobCard({ job, deleteJob, getNextState, moveJob, formatDate }: JobCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
    data: { job }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : 1,
  } : undefined;

  const nextState = getNextState(job.state);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      ref={setNodeRef}
      style={style}
      className={`group w-full h-full relative bg-[var(--surface)] border border-[var(--border-subtle)] hover:border-indigo-500/40 p-5 rounded-2xl transition-all duration-300 flex flex-col gap-4 overflow-hidden 
        ${isDragging ? 'cursor-grabbing border-indigo-500 ring-2 ring-indigo-500/50 shadow-2xl opacity-90 scale-105' : 'hover:-translate-y-1 hover:shadow-[0_15px_40px_-15px_rgba(99,102,241,0.2)]'}`}
    >
      <div 
        {...listeners} 
        {...attributes} 
        className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing" 
        title="Drag to move to another state"
      />
      
      {/* Decorative gradient blob on hover */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <span className="absolute top-0 right-0 z-30 inline-flex items-center justify-center px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-bl-2xl bg-[var(--overlay)] text-[var(--text-secondary)] border-b border-l border-[var(--border-subtle)] shadow-sm">
        {job.source}
      </span>
      
      <div className="flex flex-wrap justify-between items-start gap-3 relative z-10 pointer-events-none mt-1">
        <div className="flex-1 min-w-0 w-full">
          <Link href={`/job/${job.id}`} className="font-bold text-[var(--text-main)] text-[16px] leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors break-words line-clamp-2 pr-24 pointer-events-auto relative z-20">
            {job.title}
          </Link>
          <div className="flex items-center gap-2 mt-2.5 text-sm text-[var(--text-secondary)] font-medium">
            <Building2 className="w-4 h-4 shrink-0 text-indigo-400" />
            <span className="truncate">{job.company}</span>
          </div>
          {job.location && job.location.toLowerCase() !== 'unknown' && (
            <div className="flex items-center gap-2 mt-1.5 text-xs text-[var(--text-muted)]">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
              <span className="truncate">{job.location}</span>
            </div>
          )}
          {job.matchScore !== undefined && (
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 bg-[var(--overlay)] rounded-full overflow-hidden max-w-[100px]">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${job.matchScore >= 80 ? 'bg-cyan-400' : job.matchScore >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`} 
                  style={{ width: `${job.matchScore}%` }} 
                />
              </div>
              <span className={`text-[11px] font-extrabold tracking-wide uppercase ${job.matchScore >= 80 ? 'text-cyan-500 dark:text-cyan-400' : job.matchScore >= 50 ? 'text-yellow-500 dark:text-yellow-400' : 'text-red-500 dark:text-red-400'}`}>
                {job.matchScore}% Match
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-auto pt-4 border-t border-[var(--border-subtle)] relative z-20">
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] font-semibold shrink-0 uppercase tracking-wide">
          <Calendar className="w-3.5 h-3.5" />
          {formatDate(job.createdAt)}
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); deleteJob(job.id); }}
              className="flex items-center justify-center w-8 h-8 shrink-0 rounded-full bg-[var(--overlay)] hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-colors pointer-events-auto"
              title="Delete Job"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <Link 
              href={`/job/${job.id}`}
              className="flex flex-1 sm:flex-none justify-center items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-indigo-500 hover:from-indigo-400 hover:to-indigo-400 text-white rounded-lg text-xs font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] pointer-events-auto"
            >
              Details <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            {nextState && (
              <button 
                onClick={(e) => { e.stopPropagation(); moveJob(job.id, nextState); }}
                className="flex shrink-0 items-center gap-1 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-600 dark:text-indigo-400 hover:text-white rounded-lg text-xs font-semibold transition-all pointer-events-auto"
              >
                Move <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
        </div>
      </div>
    </motion.div>
  );
}
