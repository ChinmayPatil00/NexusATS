chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveJob") {
    // Send POST request to local Nexus ATS backend
    fetch("http://localhost:4000/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request.data)
    })
      .then(res => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        console.error("Error saving job:", error);
        sendResponse({ success: false, error: error.message });
      });

    // Return true to indicate that we will send a response asynchronously
    return true; 
  }
});
