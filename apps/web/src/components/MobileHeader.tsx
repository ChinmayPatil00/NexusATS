"use client";

import React from 'react';
import Link from "next/link";
import { Activity } from "lucide-react";
import { UserButton, SignInButton, useAuth } from "@clerk/nextjs";
import { ThemeToggle } from "./ThemeToggle";

export function MobileHeader() {
  const { isLoaded, userId } = useAuth();

  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[var(--surface)]/90 backdrop-blur-xl border-b border-[var(--border-subtle)] sticky top-0 z-40 shrink-0">
      <Link href="/dashboard" className="flex items-center gap-2.5 group">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] group-hover:scale-105 transition-transform">
          <Activity className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-black tracking-tight text-[var(--text-main)]">
          Nexus<span className="font-light text-[var(--text-muted)]">ATS</span>
        </span>
      </Link>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        {isLoaded && userId ? (
          <UserButton appearance={{ elements: { avatarBox: "w-8 h-8 shadow-sm" } }} />
        ) : (
          <SignInButton mode="modal">
            <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
              Sign In
            </button>
          </SignInButton>
        )}
      </div>
    </header>
  );
}
