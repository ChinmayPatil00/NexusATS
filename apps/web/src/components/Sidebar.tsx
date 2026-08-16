"use client";

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, useUser, UserButton, SignInButton } from "@clerk/nextjs";
import { Activity, LayoutDashboard, BarChart3, Info, MapPin, LogOut, Save, CheckCircle2, User, Search, Filter, Rocket } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Sidebar() {
  const pathname = usePathname();
  const { isLoaded, userId } = useAuth();
  const { user } = useUser();
  
  const [selectedRole, setSelectedRole] = useState("Software Engineer");
  const [selectedType, setSelectedType] = useState("Full-Time");
  const [location, setLocation] = useState("Remote");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/discover", label: "Discover", icon: Search },
    { href: "/startups", label: "Discover Startups", icon: Rocket },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/profile", label: "Profile", icon: User },
    { href: "/about", label: "About", icon: Info },
  ];

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface)]/90 backdrop-blur-xl border-t border-[var(--border-subtle)] pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around p-3">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isActive ? 'text-indigo-500' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-bold tracking-wide">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-full bg-[var(--surface)]/80 backdrop-blur-xl border-r border-[var(--border-subtle)] shadow-xl shrink-0">
        
        {/* Logo Area */}
        <div className="p-6 border-b border-[var(--border-subtle)] shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-[0_0_20px_rgba(99,102,241,0.2)] group-hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] transition-all">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-[var(--text-main)]">
              Nexus<span className="font-light text-[var(--text-muted)]">ATS</span>
            </span>
          </Link>
        </div>
        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-indigo-500/10 text-indigo-500 font-bold border border-indigo-500/20' 
                    : 'text-[var(--text-secondary)] hover:bg-[var(--overlay)] hover:text-[var(--text-main)] font-semibold border border-transparent'
                }`}
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* User / Settings Footer */}
        <div className="p-4 border-t border-[var(--border-subtle)] shrink-0 space-y-4">
          
          <div className="flex items-center justify-between px-2">
            <ThemeToggle />
          </div>

          {isLoaded && userId ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--overlay)] border border-[var(--border-subtle)] shadow-inner">
              <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-10 h-10 rounded-lg shadow-md" } }} />
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold truncate text-[var(--text-main)]">{user?.fullName || 'User'}</span>
                <span className="text-xs text-[var(--text-muted)] truncate">{user?.primaryEmailAddress?.emailAddress || ''}</span>
              </div>
            </div>
          ) : (
            <div className="px-2">
              <SignInButton mode="modal">
                <button className="w-full px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                  Sign In
                </button>
              </SignInButton>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
