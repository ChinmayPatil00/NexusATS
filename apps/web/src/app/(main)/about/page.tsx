import { Info, Target, Zap, Globe, Shield } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto py-12 px-6 sm:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-black tracking-tight text-[var(--text-main)] flex items-center gap-4 mb-4">
            <Info className="w-8 h-8 text-indigo-400" />
            About Nexus ATS
          </h1>
          <p className="text-xl text-[var(--text-muted)] max-w-2xl mx-auto">&quot;The best way to predict the future is to create it.&quot;</p>
          <p className="text-lg text-gray-400 leading-relaxed">
            Nexus ATS is an intelligent Job Aggregator Engine designed to streamline the modern job hunt. Instead of manually scouring multiple job boards, Nexus employs a fleet of automated background scrapers that continuously hunt for roles matching your exact specifications.
          </p>
        </div>

        <div className="space-y-12">
          <section className="bg-[#121214] border border-white/5 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">How it Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <Target className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-white">1. Define Your Target</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Use the Target filter in the top navigation bar to specify your desired Role, Job Type, and Location. This instantly updates the target profile for our scraper fleet.
                </p>
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                  <Globe className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-white">2. Global Scraping</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Our background nodes continuously scan LinkedIn, Indeed, Naukri, and Internshala. They bypass captchas and extract the latest job postings matching your profile.
                </p>
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                  <Zap className="w-6 h-6 text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold text-white">3. Intelligent Aggregation</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Jobs are deduplicated, normalized, and saved to your personal Kanban board. You&apos;ll receive instant email or SMS notifications the moment a high-value match is found.
                </p>
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                  <Shield className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-white">4. Pipeline Management</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Track your applications from &quot;New Match&quot; to &quot;Offer&quot;. Click on any job to view its detailed description and apply directly to the company.
                </p>
              </div>
            </div>
          </section>

          <div className="flex justify-center pt-8">
            <Link 
              href="/dashboard"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-bold tracking-wide shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
