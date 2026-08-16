import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { exec } from "child_process";
import path from "path";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scraperPath = path.resolve(process.cwd(), '../../packages/scraper');
    console.log(`[Next.js API] Triggering manual scrape at ${scraperPath} for user ${userId}`);
    
    // Fire and forget
    exec(`npx tsx src/index.ts ${userId}`, { cwd: scraperPath }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Scraper Trigger Error]: ${error.message}`);
        return;
      }
      console.log(`[Scraper Trigger Output]: ${stdout}`);
    });
    
    return NextResponse.json({ success: true, message: 'Scraper triggered in background.' });
  } catch (error) {
    console.error("Error triggering scrape:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
