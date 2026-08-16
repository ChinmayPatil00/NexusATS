# 🚀 Nexus ATS

Nexus ATS (Applicant Tracking System) is a fully autonomous, AI-powered job application platform. It automatically scrapes jobs from major platforms, grades them against your resume using Google Gemini AI, and provides a drag-and-drop Kanban dashboard to manage your applications.

## ✨ Features

- **🤖 Automated Headless Scraping:** Continuously hunts for jobs matching your role and location on major platforms (LinkedIn, Naukri, Wellfound, Y-Combinator).
- **🧠 AI Resume Matching:** Uses Gemini 3.5-Flash to grade every incoming job against your uploaded PDF resume, giving you a Match Score and rationale.
- **📋 Kanban Dashboard:** A drag-and-drop Trello-style board to track applications from 'New' to 'Offer'.
- **📝 AI Cover Letter Generator:** Instantly write tailored cover letters for specific jobs using your profile data.
- **🎤 AI Interview Prep Workspace:** Generate mock technical interview questions tailored to the specific job description and your resume.
- **📊 Analytics Pipeline:** Visual charts tracking your conversion rates across the application funnel.
- **🔐 Secure Auth:** Enterprise-grade security and multi-tenancy powered by Clerk.

## 🏗️ Architecture

This is a monolithic Turborepo containing multiple packages:

- `apps/web`: The Next.js 14 frontend application (React, TailwindCSS, Framer Motion).
- `apps/api`: A background Node.js/Express server that triggers scrapers and AI matching pipelines.
- `packages/scraper`: Puppeteer scripts that run headless browsers to fetch job postings.
- `packages/database`: Prisma ORM configuration and SQLite database.

---

## 🛠️ Local Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root directory (and copy to `apps/web` / `apps/api` if necessary):
   ```env
   # Database
   DATABASE_URL="file:./dev.db"

   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...

   # Google Gemini AI
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Database Migration**
   Initialize the SQLite database.
   ```bash
   npm run db:push
   ```

4. **Run the Development Servers**
   Open two terminal windows:

   Terminal 1 (Next.js Frontend):
   ```bash
   cd apps/web
   npm run dev
   ```

   Terminal 2 (Express Backend & Scraper):
   ```bash
   cd apps/api
   npx tsx src/index.ts
   ```

---

## 🚀 Production Deployment Guide

To host Nexus ATS on the web, you need to separate the frontend from the backend background workers.

### 1. Database (Supabase / Neon)
SQLite is great for local development, but Vercel requires a Serverless PostgreSQL database.
1. Create a free PostgreSQL database on [Supabase](https://supabase.com/).
2. Change the `DATABASE_URL` in `.env` to your new connection string.
3. Update `packages/database/prisma/schema.prisma` provider from `"sqlite"` to `"postgresql"`.

### 2. Frontend (Vercel)
1. Push your code to GitHub.
2. Go to [Vercel](https://vercel.com) and import your `NexusATS` repository.
3. Set the Root Directory to `apps/web`.
4. Add your `.env` variables (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, etc.) in the Vercel Dashboard.
5. Click **Deploy**.

### 3. Backend Background Scraper (Render / Railway)
Because the background scraper uses Puppeteer (a headless Chrome browser), it cannot run on Vercel's Edge network. It requires a traditional Node.js server.
1. Go to [Render](https://render.com) or [Railway](https://railway.app).
2. Create a new "Web Service" from your GitHub repository.
3. Set the Root Directory to `apps/api`.
4. Add your `.env` variables (including `DATABASE_URL` and `GEMINI_API_KEY`).
5. Ensure the deployment environment installs Chrome/Puppeteer dependencies.
6. Click **Deploy**.
