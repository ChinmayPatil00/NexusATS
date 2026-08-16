"use client";

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { JobState } from '@/lib/api';

interface KanbanTabProps {
  label: string;
  state: JobState;
  color: string;
  count: number;
  isActive: boolean;
  setActiveTab: (state: JobState) => void;
  isDraggingAny: boolean;
}

export default function KanbanTab({ label, state, color, count, isActive, setActiveTab, isDraggingAny }: KanbanTabProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: state
  });

  return (
    <button
      ref={setNodeRef}
      onClick={() => setActiveTab(state)}
      className={`flex items-center justify-between min-w-[140px] md:w-full px-4 py-3 rounded-xl border transition-all duration-300 text-left shrink-0 ${
        isOver ? 'bg-indigo-500/20 border-indigo-500 ring-2 ring-indigo-500/50 scale-[1.02] shadow-lg shadow-indigo-500/20' :
        isActive 
          ? `bg-gradient-to-br ${color} border-transparent shadow-lg dark:shadow-none scale-[1.02]` 
          : 'bg-transparent border-transparent hover:bg-[var(--overlay)] text-[var(--text-muted)]'
      } ${isDraggingAny && !isActive && !isOver ? 'opacity-50 border-dashed border-[var(--border-strong)]' : ''}`}
    >
      <span className={`font-bold tracking-wide text-xs uppercase transition-colors ${isActive || isOver ? '' : 'text-[var(--text-muted)]'}`}>
        {label}
      </span>
      <span className={`text-xs font-bold px-2 py-1 rounded-md transition-colors ${isActive || isOver ? 'bg-black/30 text-white' : 'bg-[var(--overlay)] text-[var(--text-muted)]'}`}>
        {count}
      </span>
    </button>
  );
}
