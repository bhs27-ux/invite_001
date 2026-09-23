// --- MP3 AUDIO PLAYER CONTROL ---
const audio = document.getElementById('bg-audio');
const toggleBtn = document.getElementById('audio-toggle-btn');
const labelText = document.getElementById('audio-label-text');

function updateUI(isPlaying) {
  if (isPlaying) {
    if (toggleBtn) toggleBtn.innerText = '⏸';
    if (labelText) labelText.innerText = 'Playing Music';
  } else {
    if (toggleBtn) toggleBtn.innerText = '▶';
    if (labelText) labelText.innerText = 'Play Background Music';
  }
}

// Triggered when guest clicks "Open Invitation"
function openInvitation() {
  if (audio) {
    // Explicitly call load() to prepare the audio pipeline on iOS Safari
    audio.load();
    audio.play().then(() => {
      updateUI(true);
    }).catch(err => {
      console.error("Playback failed:", err);
      updateUI(false);
    });
  }

  // Smoothly fade out and remove the entry overlay
  const overlay = document.getElementById('invitation-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.visibility = 'hidden';
  }
}

// Manual play/pause toggle for the widget button
function toggleAudio() {
  if (!audio) return;
  
  if (audio.paused) {
    audio.play().then(() => {
      updateUI(true);
    }).catch(err => {
      console.error("Playback prevented:", err);
      if (labelText) labelText.innerText = 'Audio blocked by browser';
    });
  } else {
    audio.pause();
    updateUI(false);
  }
}

if (audio) {
  audio.onended = () => {
    updateUI(false);
  };
}


// --- GOOGLE APPS SCRIPT RSVP PORTAL ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwhbGbWp8OZTVeWtRw5g2LRmIEGkF9CuK4CAfG2Syv1YeTe1_h7F8qKrfG8r61EhnlB/exec";

// Global variables for tracking RSVP states
let guestId = null;
let currentMorningAttendance = "";
let currentEveningAttendance = "";

// --- 1. FETCH GUEST DATA & PUBLIC GREETINGS ON LOAD/PAGESHOW ---
// Uses "pageshow" instead of "DOMContentLoaded" to handle Safari bfcache (back/forward navigation & reloads)
window.addEventListener("pageshow", () => {
  // Always fetch public greetings wall
  loadPublicGreetings();

  // Extract and decode guest ID dynamically on every page view
  const urlParams = new URLSearchParams(window.location.search);
  const rawId = urlParams.get('id');
  guestId = rawId ? decodeURIComponent(rawId).trim() : null;

  if (guestId) {
    // Cache-busting parameter (_=Date.now()) + cache: 'no-store' forces Safari to fetch fresh data
    const fetchUrl = `${SCRIPT_URL}?id=${encodeURIComponent(guestId)}&_=${Date.now()}`;

    fetch(fetchUrl, { 
      redirect: 'follow',
      cache: 'no-store'
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(guestData => {
        if (guestData && guestData.status === "success") {
          const rsvpHeader = document.getElementById('rsvp-header');
          const rsvpGreeting = document.getElementById('rsvp-greeting');
          const overlayGreeting = document.getElementById('invitation-overlay-greeting');

          if (rsvpHeader) rsvpHeader.style.display = 'block';
          if (rsvpGreeting) rsvpGreeting.innerText = `Dear ${guestData.name},`;
          if (overlayGreeting) overlayGreeting.innerText = `${guestData.name}`;

          // Dynamic subtext based on party size
          const subtextElement = document.getElementById('rsvp-subtext');
          if (subtextElement) {
            if (guestData.size === 'family') {
              subtextElement.innerText = "We can't wait to celebrate with your whole family! Please let us know if your household will be attending.";
            } else if (guestData.size === 'couple') {
              subtextElement.innerText = "We hope the two of you can make it! Let us know if you both will be celebrating with us.";
            } else {
              subtextElement.innerText = "We would love to have you join us on our special day. Please let us know if you can attend.";
            }
          }

          // Holy Matrimony
          if (guestData.morningInvite === 1 || guestData.morningInvite === "1") {
            const matrimonyCard = document.getElementById('matrimony-card');
            if (matrimonyCard) matrimonyCard.style.display = 'block';
            
            if (guestData.morningAttendance) {
              currentMorningAttendance = guestData.morningAttendance;
              const matrimonyStatus = document.getElementById('matrimony-status');
              if (matrimonyStatus) {
                matrimonyStatus.innerText = `Your response: ${guestData.morningAttendance === 'Yes' ? 'Attending' : 'Not Attending'}`;
              }
            }
          }

          // Reception
          if (guestData.eveningInvite === 1 || guestData.eveningInvite === "1") {
            const receptionCard = document.getElementById('reception-card');
            if (receptionCard) receptionCard.style.display = 'block';
            
            if (guestData.eveningAttendance) {
              currentEveningAttendance = guestData.eveningAttendance;
              const receptionStatus = document.getElementById('reception-status');
              if (receptionStatus) {
                receptionStatus.innerText = `Your response: ${guestData.eveningAttendance === 'Yes' ? 'Attending' : 'Not Attending'}`;
              }
            }
          }

          // Greeting Card: Show input & pre-fill if guest previously submitted a wish
          const greetingInputCard = document.getElementById('greeting-input-card');
          if (greetingInputCard) greetingInputCard.style.display = 'block';
          
          if (guestData.greetings) {
            const guestGreetingText = document.getElementById('guest-greeting-text');
            if (guestGreetingText) guestGreetingText.value = guestData.greetings;
          }
        }
      })
      .catch(err => console.error("Error fetching guest data:", err));
  }
});


// --- 2. SUBMIT RSVP ATTENDANCE ---
function submitEventRSVP(eventType, responseValue) {
  if (!guestId) return;

  const globalStatus = document.getElementById('rsvp-global-status');
  if (globalStatus) {
    globalStatus.style.color = '#2B6CB0';
    globalStatus.innerText = "Saving your response...";
  }

  if (eventType === 'morning') currentMorningAttendance = responseValue;
  if (eventType === 'evening') currentEveningAttendance = responseValue;

  fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      id: guestId,
      morningAttendance: currentMorningAttendance,
      eveningAttendance: currentEveningAttendance
    })
  })
  .then(res => {
    if (!res.ok) throw new Error("Server error");
    return res.json();
  })
  .then(result => {
    if (result.status === "updated" && globalStatus) {
      globalStatus.style.color = '#2F855A';
      globalStatus.innerText = "Response saved successfully!";
      
      const targetElement = eventType === 'morning' ? 'matrimony-status' : 'reception-status';
      const statusEl = document.getElementById(targetElement);
      if (statusEl) {
        statusEl.innerText = `Your response: ${responseValue === 'Yes' ? 'Attending' : 'Not Attending'}`;
      }
    }
  })
  .catch(err => {
    if (globalStatus) {
      globalStatus.style.color = '#E53E3E';
      globalStatus.innerText = "Something went wrong. Please try again.";
    }
  });
}


// --- 3. SUBMIT GREETING WISH ---
function submitGreeting() {
  if (!guestId) return;

  const greetingInput = document.getElementById('guest-greeting-text');
  const greetingText = greetingInput ? greetingInput.value.trim() : "";
  const statusEl = document.getElementById('greeting-status');

  if (!greetingText) {
    if (statusEl) {
      statusEl.style.color = '#E53E3E';
      statusEl.innerText = "Please write a message before submitting.";
    }
    return;
  }

  if (statusEl) {
    statusEl.style.color = '#2B6CB0';
    statusEl.innerText = "Sending your wish...";
  }

  fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      id: guestId,
      greetings: greetingText
    })
  })
  .then(res => {
    if (!res.ok) throw new Error("Server error");
    return res.json();
  })
  .then(result => {
    if (result.status === "updated" && statusEl) {
      statusEl.style.color = '#2F855A';
      statusEl.innerText = "Thank you! Your wish has been posted.";
      loadPublicGreetings(); // Refresh public wall instantly
    }
  })
  .catch(err => {
    if (statusEl) {
      statusEl.style.color = '#E53E3E';
      statusEl.innerText = "Failed to send wish. Please try again.";
    }
  });
}


// --- 4. FETCH AND DISPLAY PUBLIC GREETINGS WALL ---
function loadPublicGreetings() {
  fetch(`${SCRIPT_URL}?action=getGreetings&_=${Date.now()}`, { 
    redirect: 'follow',
    cache: 'no-store'
  })
    .then(res => {
      if (!res.ok) throw new Error("Failed to load greetings");
      return res.json();
    })
    .then(data => {
      const wall = document.getElementById('greetings-wall');
      if (!wall) return;

      if (data.status === "success" && data.greetings && data.greetings.length > 0) {
        wall.innerHTML = data.greetings.map(item => {
          const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '';
          return `
            <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); text-align: left;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <strong style="color: var(--primary-color);">${escapeHtml(item.name)}</strong>
                <small style="color: #A0AEC0; font-size: 0.8rem;">${dateStr}</small>
              </div>
              <p style="color: #4A5568; margin: 0; font-size: 0.95rem;">${escapeHtml(item.greeting)}</p>
            </div>
          `;
        }).join('');
      } else {
        wall.innerHTML = `<p style="text-align: center; color: #718096;">Be the first to leave a wish!</p>`;
      }
    })
    .catch(err => console.error("Error loading greetings:", err));
}

// Helper to prevent HTML injection in public greetings
function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
