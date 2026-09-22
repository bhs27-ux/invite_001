// --- MP3 AUDIO PLAYER CONTROL ---
const audio = document.getElementById('bg-audio');
const toggleBtn = document.getElementById('audio-toggle-btn');
const labelText = document.getElementById('audio-label-text');

function updateUI(isPlaying) {
  if (isPlaying) {
    toggleBtn.innerText = '⏸';
    labelText.innerText = 'Playing Music';
  } else {
    toggleBtn.innerText = '▶';
    labelText.innerText = 'Play Background Music';
  }
}

// Triggered when guest clicks "Open Invitation"
function openInvitation() {
  // 1. Play the audio
  audio.play().then(() => {
    updateUI(true);
  }).catch(err => {
    console.error("Playback failed:", err);
    updateUI(false);
  });

  // 2. Smoothly fade out and remove the entry overlay
  const overlay = document.getElementById('invitation-overlay');
  overlay.style.opacity = '0';
  overlay.style.visibility = 'hidden';
}

// Manual play/pause toggle for the widget button
function toggleAudio() {
  if (audio.paused) {
    audio.play().then(() => {
      updateUI(true);
    }).catch(err => {
      console.error("Playback prevented:", err);
      labelText.innerText = 'Audio blocked by browser';
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
const urlParams = new URLSearchParams(window.location.search);
const guestId = urlParams.get('id');

let currentMorningAttendance = "";
let currentEveningAttendance = "";

// --- 1. FETCH GUEST DATA & PUBLIC GREETINGS ON LOAD ---
document.addEventListener("DOMContentLoaded", () => {
  // Always fetch public greetings wall
  loadPublicGreetings();

  // If a guest ID is present, fetch individual guest details
  if (guestId) {
    fetch(`${SCRIPT_URL}?id=${guestId}`)
      .then(res => res.json())
      .then(guestData => {
        if (guestData.status === "success") {
          document.getElementById('rsvp-header').style.display = 'block';
          document.getElementById('rsvp-greeting').innerText = `Dear ${guestData.name},`;
          document.getElementById('invitation-greeting').innerText = `Dear ${guestData.name},`;

          // Dynamic subtext based on party size
          const subtextElement = document.getElementById('rsvp-subtext');
          if (guestData.size === 'family') {
            subtextElement.innerText = "We can't wait to celebrate with your whole family! Please let us know if your household will be attending.";
          } else if (guestData.size === 'couple') {
            subtextElement.innerText = "We hope the two of you can make it! Let us know if you both will be celebrating with us.";
          } else {
            subtextElement.innerText = "We would love to have you join us on our special day. Please let us know if you can attend.";
          }

          // Holy Matrimony
          if (guestData.morningInvite === 1 || guestData.morningInvite === "1") {
            document.getElementById('matrimony-card').style.display = 'block';
            if (guestData.morningAttendance) {
              currentMorningAttendance = guestData.morningAttendance;
              document.getElementById('matrimony-status').innerText = 
                `Your response: ${guestData.morningAttendance === 'Yes' ? 'Attending' : 'Not Attending'}`;
            }
          }

          // Reception
          if (guestData.eveningInvite === 1 || guestData.eveningInvite === "1") {
            document.getElementById('reception-card').style.display = 'block';
            if (guestData.eveningAttendance) {
              currentEveningAttendance = guestData.eveningAttendance;
              document.getElementById('reception-status').innerText = 
                `Your response: ${guestData.eveningAttendance === 'Yes' ? 'Attending' : 'Not Attending'}`;
            }
          }

          // Greeting Card: Show input & pre-fill if guest previously submitted a wish
          document.getElementById('greeting-input-card').style.display = 'block';
          if (guestData.greetings) {
            document.getElementById('guest-greeting-text').value = guestData.greetings;
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
  globalStatus.style.color = '#2B6CB0';
  globalStatus.innerText = "Saving your response...";

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
  .then(res => res.json())
  .then(result => {
    if (result.status === "updated") {
      globalStatus.style.color = '#2F855A';
      globalStatus.innerText = "Response saved successfully!";
      
      const targetElement = eventType === 'morning' ? 'matrimony-status' : 'reception-status';
      document.getElementById(targetElement).innerText = 
        `Your response: ${responseValue === 'Yes' ? 'Attending' : 'Not Attending'}`;
    }
  })
  .catch(err => {
    globalStatus.style.color = '#E53E3E';
    globalStatus.innerText = "Something went wrong. Please try again.";
  });
}

// --- 3. SUBMIT GREETING WISH ---
function submitGreeting() {
  if (!guestId) return;

  const greetingText = document.getElementById('guest-greeting-text').value.trim();
  const statusEl = document.getElementById('greeting-status');

  if (!greetingText) {
    statusEl.style.color = '#E53E3E';
    statusEl.innerText = "Please write a message before submitting.";
    return;
  }

  statusEl.style.color = '#2B6CB0';
  statusEl.innerText = "Sending your wish...";

  fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      id: guestId,
      greetings: greetingText
    })
  })
  .then(res => res.json())
  .then(result => {
    if (result.status === "updated") {
      statusEl.style.color = '#2F855A';
      statusEl.innerText = "Thank you! Your wish has been posted.";
      loadPublicGreetings(); // Refresh public wall instantly
    }
  })
  .catch(err => {
    statusEl.style.color = '#E53E3E';
    statusEl.innerText = "Failed to send wish. Please try again.";
  });
}

// --- 4. FETCH AND DISPLAY PUBLIC GREETINGS WALL ---
function loadPublicGreetings() {
  fetch(`${SCRIPT_URL}?action=getGreetings`)
    .then(res => res.json())
    .then(data => {
      const wall = document.getElementById('greetings-wall');
      if (data.status === "success" && data.greetings.length > 0) {
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