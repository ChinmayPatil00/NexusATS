"use client";
import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Code, Link as LinkIcon, Save, CheckCircle2, Loader2, Activity, FileText, UploadCloud, ShieldCheck, Calendar } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

export default function ProfilePage() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [hasResume, setHasResume] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  
  useEffect(() => {
    fetch('/api/profile')
      .then(res => res.json())
      .then(user => {
        if (user) {
          if (user.name) setName(user.name);
          if (user.email) setEmail(user.email);
          if (user.phoneNumber) setPhone(user.phoneNumber);
          if (user.githubUrl) setGithubUrl(user.githubUrl);
          if (user.linkedinUrl) setLinkedinUrl(user.linkedinUrl);
          if (user.resumeText) setHasResume(true);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Sync with Clerk user details
  useEffect(() => {
    if (clerkUser) {
      if (!name && clerkUser.fullName) setName(clerkUser.fullName);
      if (!email && clerkUser.primaryEmailAddress?.emailAddress) {
        setEmail(clerkUser.primaryEmailAddress.emailAddress);
      }
    }
  }, [clerkUser, name, email]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phoneNumber: phone,
          githubUrl,
          linkedinUrl
        })
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingResume(true);
    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await fetch('/api/upload-resume', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setHasResume(true);
      } else {
        alert("Failed to upload resume. Please make sure it is a valid PDF.");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading resume.");
    }
    setUploadingResume(false);
  };

  if (loading && !isClerkLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const displayEmail = clerkUser?.primaryEmailAddress?.emailAddress || email;
  const displayName = clerkUser?.fullName || name || "Nexus ATS Member";

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--background)] transition-colors">
      <header className="px-8 py-6 border-b border-[var(--border-subtle)] bg-[var(--surface)]/20 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <User className="w-6 h-6 text-indigo-400" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-main)] tracking-tight">Your Profile</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">Manage your account identity and application details.</p>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-8">
        {/* Logged-in Clerk User Info Card */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-cyan-500/10 border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden backdrop-blur-sm shadow-sm">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10">
              {/* Avatar */}
              <div className="relative shrink-0">
                {clerkUser?.imageUrl ? (
                  <img
                    src={clerkUser.imageUrl}
                    alt={displayName}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500/30 shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold shadow-md">
                    {(displayName[0] || 'U').toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[var(--background)] flex items-center justify-center" title="Active Clerk Session">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
              </div>

              {/* User Details */}
              <div className="flex-1 text-center sm:text-left space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight">
                    {displayName}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 w-fit mx-auto sm:mx-0">
                    <ShieldCheck className="w-3 h-3 text-indigo-400" />
                    Verified User
                  </span>
                </div>

                <p className="text-sm font-medium text-[var(--text-muted)] flex items-center justify-center sm:justify-start gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{displayEmail || "No email attached"}</span>
                </p>

                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-[var(--text-muted)] font-medium">
                  {clerkUser?.id && (
                    <span className="bg-[var(--surface)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] font-mono text-[11px]">
                      ID: {clerkUser.id}
                    </span>
                  )}
                  {clerkUser?.createdAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      Joined {new Date(clerkUser.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSave} className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
            <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider border-b border-[var(--border-subtle)] pb-3">
              Application & Cover Letter Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Email (Linked)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-gray-500" />
                  </div>
                  <input
                    type="email"
                    value={displayEmail}
                    disabled
                    className="w-full bg-[var(--overlay)] border border-[var(--border-subtle)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--text-muted)] cursor-not-allowed"
                    title="Email is synced with your Clerk account."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="w-4 h-4 text-gray-500" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">LinkedIn URL</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="w-4 h-4 text-gray-500" />
                  </div>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    placeholder="https://linkedin.com/in/johndoe"
                  />
                </div>
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">GitHub URL</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Code className="w-4 h-4 text-gray-500" />
                  </div>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    placeholder="https://github.com/johndoe"
                  />
                </div>
              </div>

              {/* Resume Upload Section */}
              <div className="space-y-2 md:col-span-2 mt-4 pt-4 border-t border-[var(--border-subtle)]">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex justify-between items-center">
                  <span>Resume (PDF)</span>
                  {hasResume && <span className="text-cyan-500 dark:text-cyan-400 flex items-center gap-1 text-[10px] bg-cyan-500/10 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> Uploaded</span>}
                </label>
                <div className="relative border-2 border-dashed border-[var(--border-strong)] hover:border-indigo-500/30 rounded-2xl p-8 flex flex-col items-center justify-center transition-all bg-[var(--overlay)]">
                  <input 
                    type="file" 
                    accept="application/pdf" 
                    onChange={handleResumeUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploadingResume}
                  />
                  
                  {uploadingResume ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                      <p className="text-sm font-medium text-[var(--text-muted)]">Parsing Resume...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] flex items-center justify-center mb-2">
                        <FileText className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
                      </div>
                      <p className="text-sm font-medium text-[var(--text-main)]">Click or drag your Resume PDF here</p>
                      <p className="text-xs text-[var(--text-muted)]">Max size 5MB. AI will use this to write tailored cover letters.</p>
                      
                      <button type="button" className="mt-2 px-4 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border-strong)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--overlay)] flex items-center gap-2">
                        <UploadCloud className="w-3.5 h-3.5" />
                        {hasResume ? 'Replace File' : 'Upload File'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>

            <div className="pt-6 border-t border-[var(--border-subtle)] flex items-center justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm transition-all disabled:opacity-50"
              >
                {saving ? (
                  <><Activity className="w-4 h-4 animate-spin" /> Saving...</>
                ) : showSuccess ? (
                  <><CheckCircle2 className="w-4 h-4" /> Saved</>
                ) : (
                  <><Save className="w-4 h-4" /> Save Profile</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
