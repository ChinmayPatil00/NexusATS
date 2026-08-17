"use client";

import Link from "next/link";
import { ArrowRight, Target, Sparkles, Globe, Activity, Rocket } from "lucide-react";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3
    }
  }
};

const item: any = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020202] text-white overflow-hidden relative selection:bg-indigo-500/30 font-sans">
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/10 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[20%] right-[-20%] w-[60vw] h-[60vw] rounded-full bg-cyan-500/10 blur-[150px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute bottom-[-20%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-purple-600/10 blur-[150px] animate-pulse" style={{ animationDuration: '10s' }} />
        
        {/* Subtle Premium Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      </div>

      {/* Navbar */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex items-center justify-between px-6 py-6 lg:px-12 max-w-[1400px] mx-auto"
      >
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-cyan-500 to-indigo-600 shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-white/10 group-hover:scale-110 transition-transform duration-500">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-cyan-200">
            Nexus<span className="font-light text-white/50">ATS</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="hidden sm:inline-block px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-semibold transition-all hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            Login
          </Link>
          <Link href="/dashboard" className="px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all transform hover:-translate-y-0.5 hover:scale-105">
            Enter App
          </Link>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <main className="relative z-10 pt-24 pb-32 px-6 lg:px-12 max-w-[1400px] mx-auto min-h-[90vh] flex flex-col justify-center">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-16">
          
          {/* Left Text Content */}
          <div className="flex-1 text-center lg:text-left z-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold tracking-widest uppercase mb-8 shadow-[0_0_20px_rgba(99,102,241,0.15)] backdrop-blur-xl"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,1)]"></span>
              </span>
              Next-Gen AI Job Hunter Active
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.05] mb-6"
            >
              Intelligent Career <br className="hidden lg:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-cyan-400 drop-shadow-[0_0_40px_rgba(34,211,238,0.2)]">
                Management.
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="text-lg md:text-xl text-gray-400/90 max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed font-medium"
            >
              Our platform intelligently sources premier opportunities worldwide, utilizes advanced AI to analyze your profile, and streamlines your application process with precision.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            >
              <Link 
                href="/dashboard"
                className="w-full sm:w-auto group flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-black text-lg hover:scale-105 hover:shadow-[0_0_50px_rgba(99,102,241,0.6)] transition-all duration-300 ring-4 ring-indigo-500/30"
              >
                Launch Dashboard
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
              </Link>
              <Link 
                href="/profile"
                className="w-full sm:w-auto group flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-lg hover:scale-105 transition-all duration-300"
              >
                Upload Resume
              </Link>
            </motion.div>
          </div>

          {/* Right Floating Mockup */}
          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex-1 w-full max-w-2xl hidden md:block relative z-10"
          >
            <div className="relative rounded-2xl border border-white/10 bg-[#0a0a0a]/80 backdrop-blur-2xl p-6 shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-1/2 bg-gradient-to-br from-indigo-500/20 to-transparent blur-[80px]" />
              
              <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="text-xs font-semibold text-gray-500 tracking-wider">Nexus PIPELINE</div>
              </div>

              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="space-y-4">
                  <div className="h-2 w-20 bg-indigo-500/50 rounded-full mb-4" />
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                      <div className="h-4 w-3/4 bg-white/20 rounded-md" />
                      <div className="h-3 w-1/2 bg-white/10 rounded-md" />
                      <div className="mt-2 flex justify-between items-center">
                        <div className="h-6 w-16 bg-cyan-500/20 rounded-full" />
                        <div className="w-6 h-6 rounded-full bg-white/10" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-4 pt-8">
                  <div className="h-2 w-24 bg-cyan-500/50 rounded-full mb-4" />
                  <div className="bg-gradient-to-b from-indigo-500/10 to-cyan-500/10 border border-indigo-500/30 rounded-xl p-4 flex flex-col gap-3 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                    <div className="h-4 w-3/4 bg-white/30 rounded-md" />
                    <div className="h-3 w-1/2 bg-white/20 rounded-md" />
                    <div className="mt-2 flex justify-between items-center">
                      <div className="h-6 w-20 bg-cyan-400/30 rounded-full" />
                      <div className="w-6 h-6 rounded-full bg-indigo-500/50" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Premium Feature Bento Grid */}
        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-40 text-left w-full"
        >

          <motion.div variants={item} className="group relative p-8 rounded-[2rem] bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 hover:border-cyan-500/50 transition-all duration-500 hover:-translate-y-2 overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 flex items-center justify-center mb-6 border border-cyan-500/30 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all duration-500">
              <Globe className="w-7 h-7 text-cyan-400" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-white tracking-tight">Global Opportunity Sourcing</h3>
            <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
              Comprehensive, automated market analysis across all major professional networks to deliver exclusive opportunities directly to you.
            </p>
          </motion.div>

          <motion.div variants={item} className="group relative p-8 rounded-[2rem] bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 hover:border-purple-500/50 transition-all duration-500 hover:-translate-y-2 overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6 border border-purple-500/30 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all duration-500">
              <Rocket className="w-7 h-7 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-white tracking-tight">Intuitive Pipeline Management</h3>
            <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
              Seamlessly organize and track your applications through a highly responsive, professional board interface designed for maximum efficiency.
            </p>
          </motion.div>

          <motion.div variants={item} className="group relative p-8 rounded-[2rem] bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 hover:border-cyan-500/50 transition-all duration-500 hover:-translate-y-2 overflow-hidden col-span-1 md:col-span-2 lg:col-span-2 shadow-2xl backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 flex items-center justify-center mb-6 border border-cyan-500/30 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all duration-500">
                  <Target className="w-7 h-7 text-cyan-400" />
                </div>
                <h3 className="text-3xl font-black mb-4 text-white tracking-tight">Precision AI Matching</h3>
                <p className="text-gray-400 leading-relaxed text-lg group-hover:text-gray-300 transition-colors">
                  Define your ideal parameters and leverage our proprietary algorithms to accurately score and filter opportunities, ensuring absolute alignment with your career trajectory.
                </p>
              </div>
              <div className="hidden lg:flex flex-col gap-3 flex-1 bg-black/40 p-6 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-sm font-medium">Software Engineer @ Stripe</span>
                  <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 text-xs font-bold">98% Match</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 opacity-50">
                  <span className="text-sm font-medium text-gray-400">Junior Dev @ Unknown</span>
                  <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-bold">12% Match</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>


      </main>
    </div>
  );
}
