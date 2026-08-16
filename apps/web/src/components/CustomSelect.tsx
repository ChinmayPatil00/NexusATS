"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

interface CustomSelectProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  className?: string;
  dropdownClassName?: string;
}

export default function CustomSelect({ value, options, onChange, icon, className = "", dropdownClassName = "w-48" }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 w-full bg-transparent hover:bg-[var(--overlay)] rounded-md transition-colors text-sm font-semibold text-[var(--text-main)] outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        {icon && <span className="text-[var(--text-muted)] shrink-0 group-hover:text-indigo-400 transition-colors">{icon}</span>}
        <span className="truncate flex-1 text-left">{value}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full left-0 mt-2 max-h-64 overflow-y-auto custom-scrollbar bg-[var(--surface)]/95 backdrop-blur-2xl border border-[var(--border-strong)] rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] z-[100] py-1 ${dropdownClassName}`}
          >
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                  value === opt 
                    ? "bg-indigo-500/10 text-indigo-400 font-bold" 
                    : "text-[var(--text-secondary)] hover:bg-[var(--overlay)] hover:text-[var(--text-main)] font-medium"
                }`}
              >
                <span className="truncate">{opt}</span>
                {value === opt && <Check className="w-4 h-4 shrink-0" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
