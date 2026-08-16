console.log("🚀 Nexus ATS Extension Loaded!");

function injectSaveButton() {
  if (document.getElementById('nexus-ats-save-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'nexus-ats-save-btn';
  btn.innerHTML = '⚡ Save to Nexus ATS';
  
  // Style the button
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: '999999',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    transition: 'transform 0.2s, box-shadow 0.2s'
  });

  btn.onmouseover = () => {
    btn.style.transform = 'translateY(-2px)';
    btn.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.6)';
  };
  
  btn.onmouseout = () => {
    btn.style.transform = 'translateY(0)';
    btn.style.boxShadow = '0 4px 14px rgba(99, 102, 241, 0.4)';
  };

  btn.addEventListener('click', async () => {
    btn.innerHTML = '⏳ Saving...';
    btn.style.pointerEvents = 'none';

    try {
      const jobData = extractJobData();
      
      // Send message to background script to bypass CORS restrictions
      chrome.runtime.sendMessage({ action: "saveJob", data: jobData }, (response) => {
        if (response && response.success) {
          btn.innerHTML = '✅ Saved!';
          btn.style.background = '#10b981'; // emerald green
        } else {
          btn.innerHTML = '❌ Failed';
          btn.style.background = '#ef4444'; // red
        }
        setTimeout(() => {
          btn.innerHTML = '⚡ Save to Nexus ATS';
          btn.style.background = 'linear-gradient(135deg, #6366f1, #06b6d4)';
          btn.style.pointerEvents = 'auto';
        }, 3000);
      });
    } catch (err) {
      console.error(err);
      btn.innerHTML = '❌ Error';
      btn.style.background = '#ef4444';
      setTimeout(() => {
        btn.innerHTML = '⚡ Save to Nexus ATS';
        btn.style.background = 'linear-gradient(135deg, #6366f1, #06b6d4)';
        btn.style.pointerEvents = 'auto';
      }, 3000);
    }
  });

  document.body.appendChild(btn);
}

function extractJobData() {
  const url = window.location.href;
  let jobTitle = "Unknown Title";
  let company = "Unknown Company";
  let location = "Unknown Location";
  let source = "Other";

  if (url.includes('linkedin.com')) {
    source = "LinkedIn";
    jobTitle = document.querySelector('h1')?.innerText || document.querySelector('.job-details-jobs-unified-top-card__job-title')?.innerText || "LinkedIn Job";
    company = document.querySelector('.job-details-jobs-unified-top-card__company-name')?.innerText || 
              document.querySelector('.app-aware-link')?.innerText || "Unknown Company";
    location = document.querySelector('.job-details-jobs-unified-top-card__primary-description span:nth-child(2)')?.innerText || 
               document.querySelector('.job-details-jobs-unified-top-card__bullet')?.innerText || "Remote";
  } else if (url.includes('indeed.com')) {
    source = "Indeed";
    jobTitle = document.querySelector('.jobsearch-JobInfoHeader-title')?.innerText || "Indeed Job";
    company = document.querySelector('[data-company-name="true"]')?.innerText || "Unknown Company";
    location = document.querySelector('#jobLocationText')?.innerText || "Remote";
  } else if (url.includes('naukri.com')) {
    source = "Naukri";
    jobTitle = document.querySelector('.styles_jhc__title__B_pSV')?.innerText || document.querySelector('.job-title')?.innerText || "Naukri Job";
    company = document.querySelector('.styles_jd-header-comp-name__MvqAI')?.innerText || "Unknown Company";
    location = document.querySelector('.styles_jhc__loc__WcqsC')?.innerText || "Remote";
  }

  return {
    jobTitle: jobTitle.trim(),
    company: company.trim(),
    location: location.trim(),
    url: url,
    source: source
  };
}

// Observe DOM changes to ensure button stays injected (SPAs like LinkedIn)
const observer = new MutationObserver(() => {
  injectSaveButton();
});
observer.observe(document.body, { childList: true, subtree: true });

// Initial injection
injectSaveButton();
