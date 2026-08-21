"use client";
import React, { useState, useEffect } from 'react';
import { Briefcase, Zap, Search, MapPin, Save, CheckCircle2, Filter } from 'lucide-react';
import { DndContext, DragEndEvent, DragStartEvent, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';

import { jobApi, Job, JobState } from '@/lib/api';
import JobCard from '@/components/JobCard';
import KanbanTab from '@/components/KanbanTab';
import CustomSelect from '@/components/CustomSelect';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<JobState>('NEW');
  const [isDraggingAny, setIsDraggingAny] = useState(false);

  // Target Prefs State
  const [selectedRole, setSelectedRole] = useState("Software Engineer");
  const [selectedType, setSelectedType] = useState("Full-Time");
  const [location, setLocation] = useState("Remote");
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

  const handleAutoSave = (role: string, type: string, loc: string) => {
    setIsSaving(true);
    let keyword = role;
    if (type === "Internship") keyword = `${role} Intern`;
    if (type === "Contract") keyword = `${role} Contract`;
    fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: [keyword], locations: [loc] })
    }).then(() => {
      fetch('/api/trigger-scrape', { method: 'POST' }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }).catch(() => setIsSaving(false));
  };

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', user?.id],
    queryFn: () => jobApi.getJobs(user?.id),
    refetchInterval: 3000,
    enabled: !!user?.id,
  });

  const moveJobMutation = useMutation({
    mutationFn: jobApi.updateJobState,
    onMutate: async ({ id, state }) => {
      await queryClient.cancelQueries({ queryKey: ['jobs'] });
      const previousJobs = queryClient.getQueryData<Job[]>(['jobs']);
      queryClient.setQueryData<Job[]>(['jobs'], (old) => 
        old?.map(job => job.id === id ? { ...job, state } : job)
      );
      return { previousJobs, id, state };
    },
    onError: (err, variables, context) => {
      if (context?.previousJobs) queryClient.setQueryData(['jobs'], context.previousJobs);
      toast.error('Failed to move job.');
    },
    onSuccess: (data, variables) => {
      toast.success(`Job moved to ${variables.state.toLowerCase()}`);
    }
  });

  const deleteJobMutation = useMutation({
    mutationFn: jobApi.deleteJob,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['jobs'] });
      const previousJobs = queryClient.getQueryData<Job[]>(['jobs']);
      queryClient.setQueryData<Job[]>(['jobs'], (old) => old?.filter(job => job.id !== id));
      return { previousJobs };
    },
    onError: (err, id, context) => {
      if (context?.previousJobs) queryClient.setQueryData(['jobs'], context.previousJobs);
      toast.error('Failed to delete job.');
    },
    onSuccess: () => toast.success('Job deleted successfully')
  });

  const columns: { label: string; state: JobState; color: string }[] = [
    { label: 'New Match', state: 'NEW', color: 'from-indigo-500/20 to-indigo-600/5 border-indigo-500/30 text-indigo-400' },
    { label: 'Shortlisted', state: 'SAVED', color: 'from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400' },
    { label: 'Applied', state: 'APPLIED', color: 'from-yellow-500/20 to-yellow-600/5 border-yellow-500/30 text-yellow-400' },
    { label: 'Interviewing', state: 'INTERVIEWING', color: 'from-indigo-500/20 to-indigo-600/5 border-indigo-500/30 text-indigo-400' },
    { label: 'Offer', state: 'OFFER', color: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30 text-cyan-400' },
  ];

  const getNextState = (currentState: JobState): JobState | null => {
    if (currentState === 'NEW') return 'SAVED';
    if (currentState === 'SAVED') return 'APPLIED';
    if (currentState === 'APPLIED') return 'INTERVIEWING';
    if (currentState === 'INTERVIEWING') return 'OFFER';
    return null;
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return 'Just now';
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  };

  // Main page should not show startup jobs
  const dashboardJobs = jobs.filter(j => {
    const src = (j.source || '').toLowerCase().trim();
    return !src.includes('ycombinator') && !src.includes('wellfound');
  });

  const filteredJobs = dashboardJobs.filter(job => {
    // Check location
    if (location !== 'All India') {
      const jobLoc = (job.location || '').toLowerCase();
      const targetLoc = location.toLowerCase();
      
      if (jobLoc === 'unknown' || jobLoc === '') {
        return false;
      }
      
      if (targetLoc === 'remote') {
        if (!jobLoc.includes('remote')) return false;
      } else {
        if (!jobLoc.includes(targetLoc) && !targetLoc.includes(jobLoc)) return false;
      }
    }

    // Check role (basic matching using selectedRole keywords)
    if (selectedRole && selectedRole !== '') {
      const jobTitle = job.title.toLowerCase();
      const roleWords = selectedRole.toLowerCase().split(' ');
      if (!roleWords.some(w => jobTitle.includes(w))) {
        return false;
      }
    }

    // Check search query
    const searchString = `${job.title} ${job.company} ${job.location || ''} ${job.source}`.toLowerCase();
    if (searchQuery.trim() !== '') return searchString.includes(searchQuery.toLowerCase().trim());
    
    return true;
  });

  const handleDragStart = (event: DragStartEvent) => setIsDraggingAny(true);
  const handleDragEnd = (event: DragEndEvent) => {
    setIsDraggingAny(false);
    const { active, over } = event;
    if (over && over.id && over.id !== activeTab) {
      const targetState = over.id as JobState;
      moveJobMutation.mutate({ id: active.id as string, state: targetState });
      setActiveTab(targetState);
    }
  };

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--background)] transition-colors relative">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none" />
        
        <header className="flex-none px-4 md:px-8 py-6 border-b border-[var(--border-subtle)] bg-[var(--surface)]/40 backdrop-blur-2xl relative z-50 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                Application Pipeline
              </h1>
              <p className="text-sm text-[var(--text-muted)] mt-2 font-medium ml-11">Track and manage your career opportunities.</p>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-3 bg-[var(--surface)] border border-[var(--border-strong)] p-2 rounded-xl shadow-sm">
              <div className="hidden md:flex items-center gap-2 px-2 text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 uppercase tracking-widest border-r border-[var(--border-subtle)] mr-1">
                <Filter className="w-3 h-3 text-indigo-400" /> Target
              </div>
              
              <CustomSelect
                value={selectedRole}
                options={["Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Engineer", "Data Scientist", "Product Manager"]}
                onChange={(val) => {
                  setSelectedRole(val);
                  handleAutoSave(val, selectedType, location);
                }}
                dropdownClassName="w-56"
              />
              
              <div className="hidden md:block w-px h-4 bg-[var(--border-strong)]" />
              
              <CustomSelect
                value={selectedType}
                options={["Full-Time", "Internship", "Contract", "Part-Time"]}
                onChange={(val) => {
                  setSelectedType(val);
                  handleAutoSave(selectedRole, val, location);
                }}
                dropdownClassName="w-48"
              />
              
              <div className="hidden md:block w-px h-4 bg-[var(--border-strong)]" />
              
              <CustomSelect
                value={location}
                options={[
                  "Remote", 
                  "Mumbai, India",
                  "Bengaluru, India", 
                  "Pune, India", 
                  "Hyderabad, India", 
                  "NCR/Delhi, India", 
                  "Chennai, India", 
                  "San Francisco, CA", 
                  "New York, NY", 
                  "London, UK"
                ]}
                onChange={(val) => {
                  setLocation(val);
                  handleAutoSave(selectedRole, selectedType, val);
                }}
                icon={<MapPin className="w-3.5 h-3.5" />}
                dropdownClassName="w-56"
              />
              
              <div className="ml-1 w-8 h-8 flex items-center justify-center shrink-0">
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" title="Saving & Refreshing..." />
                ) : showSuccess ? (
                  <span title="Saved!"><CheckCircle2 className="w-5 h-5 text-green-500" /></span>
                ) : (
                  <span title="Auto-saves on change"><Save className="w-4 h-4 text-[var(--text-muted)]" /></span>
                )}
              </div>
            </div>
            
            {/* Search Input for Kanban */}
            <div className="relative w-full md:w-64 shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-[var(--text-muted)]" />
              </div>
              <input 
                type="text" 
                placeholder="Search opportunities..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--surface)] border border-[var(--border-strong)] rounded-lg py-2 pl-9 pr-4 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
          <div className="md:w-[280px] flex-none border-b md:border-b-0 md:border-r border-[var(--border-subtle)] bg-[var(--surface)]/30 backdrop-blur-md overflow-x-auto md:overflow-y-auto custom-scrollbar p-4 flex flex-row md:flex-col gap-3 shrink-0">
            {columns.map((col) => {
              const count = filteredJobs.filter(j => j.state === col.state).length;
              return (
                <KanbanTab 
                  key={col.state}
                  label={col.label}
                  state={col.state}
                  color={col.color}
                  count={count}
                  isActive={activeTab === col.state}
                  setActiveTab={setActiveTab}
                  isDraggingAny={isDraggingAny}
                />
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 custom-scrollbar relative bg-transparent">
            <div className="max-w-[1600px] mx-auto relative h-full">
              {(() => {
                const activeCol = columns.find(c => c.state === activeTab);
                const columnJobs = filteredJobs.filter(j => j.state === activeTab);
                
                if (columnJobs.length === 0 && (!isLoading || activeTab !== 'NEW')) {
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="col-span-full flex flex-col items-center justify-center p-16 border-2 border-dashed border-[var(--border-subtle)] rounded-3xl bg-[var(--surface)]/40 backdrop-blur-sm"
                    >
                      <div className="w-16 h-16 rounded-full bg-[var(--overlay)] flex items-center justify-center mb-4 border border-[var(--border-subtle)]">
                        <Briefcase className="w-8 h-8 text-[var(--text-muted)]" />
                      </div>
                      <p className="text-[var(--text-secondary)] font-medium text-lg">No jobs in {activeCol?.label}</p>
                    </motion.div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-5 pb-10">
                    {isLoading && activeTab === 'NEW' && (
                      <>
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-48 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] animate-pulse shadow-sm" />
                        ))}
                      </>
                    )}
                    <AnimatePresence mode="popLayout">
                      {columnJobs.map((job) => (
                        <JobCard 
                          key={job.id} 
                          job={job} 
                          deleteJob={(id) => deleteJobMutation.mutate(id)}
                          getNextState={getNextState}
                          moveJob={(id, state) => moveJobMutation.mutate({ id, state })}
                          formatDate={formatDate}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
}
