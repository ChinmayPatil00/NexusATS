document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('server-status');
  
  // Ping the backend
  fetch('http://localhost:4000/api/jobs')
    .then(res => {
      if (res.ok) {
        statusEl.innerHTML = '<div class="dot"></div> Connected';
        statusEl.style.color = 'white';
      } else {
        throw new Error('Not ok');
      }
    })
    .catch(() => {
      statusEl.innerHTML = '<div class="dot" style="background:#ef4444;box-shadow:0 0 8px #ef4444;"></div> Disconnected';
      statusEl.style.color = '#ef4444';
    });
});
