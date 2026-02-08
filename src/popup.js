// Popup script - runs when user clicks extension icon
document.addEventListener('DOMContentLoaded', function() {
  console.log('[Anti-Phish Popup] Loading...');
  
  // Load stats from storage
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['scanned', 'blocked', 'learningMode'], function(result) {
      if (chrome.runtime.lastError) {
        console.log('[Anti-Phish Popup] Storage not available');
        return;
      }
      
      // Update stats
      const scanned = result.scanned || 0;
      const blocked = result.blocked || 0;
      const learningMode = result.learningMode || false;
      
      document.getElementById('scanned').textContent = scanned;
      document.getElementById('blocked').textContent = blocked;
      
      // Set toggle state
      const toggle = document.getElementById('learning-mode-toggle');
      if (toggle) {
        toggle.checked = learningMode;
      }
      
      console.log('[Anti-Phish Popup] Loaded - Scanned:', scanned, 'Blocked:', blocked, 'Learning:', learningMode);
    });
  }
  
  // Learning Mode Toggle Handler
  const learningToggle = document.getElementById('learning-mode-toggle');
  if (learningToggle) {
    learningToggle.addEventListener('change', function() {
      const isEnabled = this.checked;
      console.log('[Anti-Phish] Learning mode:', isEnabled ? 'ON' : 'OFF');
      
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ learningMode: isEnabled }, function() {
          console.log('[Anti-Phish] Learning mode saved');
        });
      }
    });
  }
  
  // GitHub button
  const githubBtn = document.getElementById('github-btn');
  if (githubBtn) {
    githubBtn.addEventListener('click', function() {
      window.open('https://github.com/idarous4/anti-phish-extension', '_blank');
    });
  }
});
