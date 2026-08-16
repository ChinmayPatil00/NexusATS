"use client";

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, UserButton, SignInButton } from "@clerk/nextjs";
import { Activity, LayoutDashboard, BarChart3, Info, MapPin, LogOut, Save, CheckCircle2, User, Search, Filter } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  const pathname = usePathname();
  const { isLoaded, userId } = useAuth();
  
  const [selectedRole, setSelectedRole] = useState("Software Engineer");
  const [selectedType, setSelectedType] = useState("Full-Time");
  const [location, setLocation] = useState("Remote");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const TECHNICAL_ROLES = [
    "Software Engineer",
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Engineer",
    "Data Scientist",
    "Product Manager",
    "DevOps Engineer",
    "UI/UX Designer",
    "Machine Learning Engineer",
    "Security Analyst"
  ];

  const JOB_TYPES = ["Full-Time", "Internship", "Contract", "Part-Time"];

  useEffect(() => {
    fetch('/api/profile')
      .then(res => res.json())
      .then(user => {
        if (user && user.keywords) {
          const kws = JSON.parse(user.keywords);
          if (kws.length > 0) {
            const kw = kws[0];
            const isIntern = kw.toLowerCase().includes('intern');
            setSelectedType(isIntern ? 'Internship' : 'Full-Time');
            const role = kw.replace(/internship/i, '').replace(/intern/i, '').trim() || 'Software Engineer';
            setSelectedRole(role);
          }
        }
        if (user && user.locations) {
          const locs = JSON.parse(user.locations);
          if (locs.length > 0) setLocation(locs[0]);
        }
      })
      .catch(err => console.error("Failed to fetch preferences:", err));
  }, []);

  const scrapeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleSaveWithParams = (role: string, type: string, loc: string) => {
    setIsSaving(true);
    let keyword = role;
    if (type === "Internship") keyword = `${role} Intern`;
    if (type === "Contract") keyword = `${role} Contract`;
    
    fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keywords: [keyword],
        locations: [loc]
      })
    }).then(() => {
      // Trigger scrape in background with debounce to prevent overload
      if (scrapeTimeoutRef.current) clearTimeout(scrapeTimeoutRef.current);
      scrapeTimeoutRef.current = setTimeout(() => {
        fetch('/api/trigger-scrape', { method: 'POST' }).catch(() => {});
      }, 2000);
      
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      // Removed window.location.reload() so debounce doesn't get killed; Dashboard polls automatically anyway.
    }).catch(err => {
      console.error("Failed to save preferences:", err);
      setIsSaving(false);
    });
  };

  const handleSave = () => {
    handleSaveWithParams(selectedRole, selectedType, location);
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/discover", label: "Discover", icon: Search },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/profile", label: "Profile", icon: User },
    { href: "/about", label: "About", icon: Info },
  ];

  return (
    <div className="flex flex-col border-b border-[var(--border-subtle)] bg-[var(--surface)]/80 backdrop-blur-xl z-20 shrink-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-cyan-500 to-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <Link href="/" className="text-lg font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-indigo-600 to-cyan-600 dark:from-white dark:via-indigo-200 dark:to-cyan-400">
              Nexus<span className="font-light text-gray-500 dark:text-white/70">ATS</span>
            </Link>
          </div>
          
          <nav className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-[inset_0_0_10px_rgba(99,102,241,0.05)]"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-[var(--overlay)]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : ""}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Global Targeting Filter Bar embedded in Navbar */}
          <div className="hidden lg:flex relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-cyan-500 to-indigo-500 rounded-xl blur opacity-10 group-hover:opacity-30 transition duration-1000"></div>
            <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border-strong)] shadow-lg">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mr-1 uppercase tracking-widest">
                <Filter className="w-3 h-3 text-indigo-400" /> Target
              </div>
              
              <div className="flex items-center gap-1 bg-[var(--background)] rounded-md px-1 border border-[var(--border-subtle)]">
                <select 
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value);
                    handleSaveWithParams(e.target.value, selectedType, location);
                  }}
                  className="bg-transparent border-none focus:ring-0 text-xs font-semibold text-[var(--text-main)] cursor-pointer hover:text-indigo-500 dark:hover:text-indigo-300 py-1 px-2 outline-none"
                >
                  {TECHNICAL_ROLES.map(role => (
                    <option key={role} value={role} className="bg-[var(--surface)] font-medium text-[var(--text-main)]">{role}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 bg-[var(--background)] rounded-md px-1 border border-[var(--border-subtle)]">
                <select 
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    handleSaveWithParams(selectedRole, e.target.value, location);
                  }}
                  className="bg-transparent border-none focus:ring-0 text-xs font-semibold text-[var(--text-main)] cursor-pointer hover:text-indigo-500 dark:hover:text-indigo-300 py-1 px-2 outline-none"
                >
                  {JOB_TYPES.map(type => (
                    <option key={type} value={type} className="bg-[var(--surface)] font-medium text-[var(--text-main)]">{type}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center bg-[var(--background)] rounded-md border border-[var(--border-subtle)] px-1">
                <MapPin className="w-3 h-3 text-gray-400 ml-1" />
                <select 
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    handleSaveWithParams(selectedRole, selectedType, e.target.value);
                  }}
                  className="bg-transparent border-none focus:ring-0 text-xs font-semibold text-[var(--text-main)] cursor-pointer hover:text-indigo-500 dark:hover:text-indigo-300 py-1 px-2 outline-none w-28"
                >
                  <optgroup label="India (IT Hubs)" className="bg-[var(--surface)] text-gray-500 font-bold">
                    <option value="Bengaluru" className="bg-[var(--surface)] font-medium text-[var(--text-main)]">Bengaluru</option>
                    <option value="Pune" className="bg-[var(--surface)] font-medium text-[var(--text-main)]">Pune</option>
                    <option value="Hyderabad" className="bg-[var(--surface)] font-medium text-[var(--text-main)]">Hyderabad</option>
                    <option value="Chennai" className="bg-[var(--surface)] font-medium text-[var(--text-main)]">Chennai</option>
                    <option value="Mumbai" className="bg-[var(--surface)] font-medium text-[var(--text-main)]">Mumbai</option>
                    <option value="Gurgaon" className="bg-[var(--surface)] font-medium text-[var(--text-main)]">Gurgaon</option>
                    <option value="Noida" className="bg-[var(--surface)] font-medium text-[var(--text-main)]">Noida</option>
                    <option value="Delhi" className="bg-[var(--surface)] font-medium text-[var(--text-main)]">Delhi</option>
                  </optgroup>
                  <optgroup label="International" className="bg-[var(--surface)] text-gray-500 font-bold">
                    <option value="Remote" className="bg-[var(--surface)] font-medium text-[var(--text-main)]">Remote (Global)</option>
                    <option value="London" className="bg-[var(--surface)] font-medium text-[var(--text-main)]">London</option>
                    <option value="New York" className="bg-[var(--surface)] font-medium text-[var(--text-main)]">New York</option>
                    <option value="San Francisco" className="bg-[var(--surface)] font-medium text-[var(--text-main)]">San Francisco</option>
                    <option value="Toronto" className="bg-[var(--surface)] font-medium text-[var(--text-main)]">Toronto</option>
                    <option value="Singapore" className="bg-[var(--surface)] font-medium text-[var(--text-main)]">Singapore</option>
                    <option value="Dubai" className="bg-[var(--surface)] font-medium text-[var(--text-main)]">Dubai</option>
                  </optgroup>
                </select>
              </div>

              <button 
                onClick={handleSave}
                disabled={isSaving}
                className={`flex items-center justify-center p-1.5 rounded-md transition-all ${
                  showSuccess ? "bg-cyan-500/20 text-cyan-400" : "bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300"
                }`}
                title="Save Targeting Profile"
              >
                {showSuccess ? <CheckCircle2 className="w-4 h-4" /> : isSaving ? <Activity className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <ThemeToggle />

          {isLoaded && userId ? (
            <div className="flex items-center gap-3 ml-2 pl-4 border-l border-[var(--border-subtle)]">
              <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-8 h-8 rounded-full border border-[var(--border-strong)]" } }} />
            </div>
          ) : (
            <div className="ml-2 flex items-center gap-2">
              <SignInButton mode="modal">
                <button className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                  Sign In
                </button>
              </SignInButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
