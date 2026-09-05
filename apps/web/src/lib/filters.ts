export function matchesLocationFilter(jobLocRaw: string | undefined | null, targetLocation: string): boolean {
  if (!targetLocation || targetLocation === "All Locations" || targetLocation === "All" || targetLocation === "All India") {
    return true;
  }
  const jobLoc = (jobLocRaw || "").toLowerCase().trim();
  const target = targetLocation.toLowerCase().trim();

  if (target === "remote") {
    return jobLoc.includes("remote") || jobLoc.includes("anywhere") || jobLoc.includes("virtual") || jobLoc.includes("wfh");
  }

  const locationAliases: Record<string, string[]> = {
    "mumbai": ["mumbai", "navi mumbai", "thane", "worli"],
    "bengaluru": ["bengaluru", "bangalore"],
    "pune": ["pune"],
    "hyderabad": ["hyderabad"],
    "ncr": ["delhi", "new delhi", "noida", "gurugram", "gurgaon", "ncr"],
    "delhi": ["delhi", "new delhi", "noida", "gurugram", "gurgaon", "ncr"],
    "chennai": ["chennai"],
    "san francisco": ["san francisco", "sf", "ca", "california", "bay area", "palo alto", "san jose", "mountain view", "san mateo"],
    "new york": ["new york", "ny"],
    "london": ["london", "uk"]
  };

  for (const [key, aliases] of Object.entries(locationAliases)) {
    if (target.includes(key)) {
      return aliases.some(alias => jobLoc.includes(alias));
    }
  }

  const cleanTarget = target.split(",")[0].trim();
  return jobLoc.includes(cleanTarget) || cleanTarget.includes(jobLoc);
}

export function matchesRoleFilter(jobTitleRaw: string | undefined | null, selectedRole: string): boolean {
  if (!selectedRole || selectedRole === "All Roles" || selectedRole === "All") {
    return true;
  }
  const title = (jobTitleRaw || "").toLowerCase();
  const role = selectedRole.toLowerCase();

  const roleKeywords: Record<string, string[]> = {
    "software engineer": ["software", "engineer", "developer", "sde", "swe", "programmer", "architect"],
    "frontend developer": ["frontend", "front-end", "front end", "react", "vue", "angular", "ui", "web developer", "next"],
    "backend developer": ["backend", "back-end", "back end", "node", "java", "python", "golang", "api", "database", "backend engineer"],
    "full stack engineer": ["full stack", "fullstack", "full-stack", "mern", "mean"],
    "data scientist": ["data", "machine learning", "ml", "ai", "artificial intelligence", "analyst", "nlp", "llm"],
    "product manager": ["product", "pm", "product owner", "program manager"],
    "internship": ["intern", "internship", "trainee", "apprentice"]
  };

  for (const [key, keywords] of Object.entries(roleKeywords)) {
    if (role.includes(key)) {
      return keywords.some(kw => title.includes(kw));
    }
  }

  const words = role.split(/\s+/).filter(w => w.length > 2);
  return words.some(w => title.includes(w));
}
