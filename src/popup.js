// Popup script - runs when user clicks extension icon
document.addEventListener('DOMContentLoaded', function() {
  console.log('[Anti-Phish Popup] Loading...');
  
  // Try to load stats - first from chrome.storage, fallback to defaults
  loadStats();
  
  // Also set up a refresh every 2 seconds while popup is open
  const refreshInterval = setInterval(loadStats, 2000);
  
  // Clean up interval when popup closes
  window.addEventListener('unload', () => clearInterval(refreshInterval));
  
  // Learning Mode Toggle
  const learningToggle = document.getElementById('learning-mode-toggle');
  if (learningToggle) {
    // Load saved state
    const savedMode = localStorage.getItem('antiPhish_learningMode') === 'true';
    learningToggle.checked = savedMode;
    
    learningToggle.addEventListener('change', function() {
      const isEnabled = this.checked;
      localStorage.setItem('antiPhish_learningMode', isEnabled.toString());
      
      // Also save to chrome.storage if available
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ learningMode: isEnabled });
      }
    });
  }
  
  // Rotate tips
  rotateTips();
});

/**
 * Load stats from chrome.storage
 */
function loadStats() {
  // Try chrome.storage first (shared across extension)
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['scanned', 'blocked'], function(result) {
      if (chrome.runtime.lastError) {
        console.log('[Anti-Phish] Storage error');
        return;
      }
      
      const scanned = result.scanned || 0;
      const blocked = result.blocked || 0;
      
      document.getElementById('scanned').textContent = scanned;
      document.getElementById('blocked').textContent = blocked;
      
      console.log('[Anti-Phish Popup] Stats - Scanned:', scanned, 'Blocked:', blocked);
    });
  } else {
    // Fallback to display 0
    document.getElementById('scanned').textContent = '0';
    document.getElementById('blocked').textContent = '0';
  }
}

/**
 * Rotate phishing tips - show different tip each time
 */
function rotateTips() {
  const tips = [
    {
      icon: '⚡',
      title: 'Urgency Trap',
      text: 'Phishing emails rush you: "Act now!" or "Account suspended!" Take your time.'
    },
    {
      icon: '👤',
      title: 'Fake Sender',
      text: 'Check the email address, not just the name. PayPal uses @paypal.com, not @gmail.com'
    },
    {
      icon: '🔗',
      title: 'Hidden Links',
      text: 'Hover over links before clicking. The real URL appears at the bottom of your browser.'
    },
    {
      icon: '🔒',
      title: 'Password Requests',
      text: 'Real companies NEVER ask for your password via email. Never.'
    },
    {
      icon: '🎁',
      title: 'Too Good To Be True',
      text: 'Free iPhones, lottery wins you never entered, inheritances from strangers = scams.'
    },
    {
      icon: '📝',
      title: 'Spelling Mistakes',
      text: 'Professional companies proofread. Multiple typos = red flag.'
    },
    {
      icon: '📎',
      title: 'Suspicious Attachments',
      text: 'Unexpected .exe, .zip, or .docm files can contain malware. Don\'t open them.'
    },
    {
      icon: '🏢',
      title: 'Generic Greetings',
      text: '"Dear Customer" instead of your name? Legitimate companies usually personalize.'
    }
  ];
  
  // Pick random tip
  const randomTip = tips[Math.floor(Math.random() * tips.length)];
  
  const tipContainer = document.getElementById('tip-container');
  if (tipContainer) {
    tipContainer.innerHTML = `
      <div style="display: flex; align-items: start; margin-bottom: 10px;">
        <span style="font-size: 24px; margin-right: 10px;">${randomTip.icon}</span>
        <div>
          <div style="font-weight: 600; color: #1a73e8; font-size: 13px; margin-bottom: 4px;">${randomTip.title}</div>
          <div style="font-size: 12px; color: #555; line-height: 1.4;">${randomTip.text}</div>
        </div>
      </div>
    `;
  }
}
