// Popup script - runs when user clicks extension icon
document.addEventListener('DOMContentLoaded', function() {
  console.log('[Anti-Phish Popup] Loading...');
  
  // Check if chrome.storage is available
  if (!chrome.storage || !chrome.storage.local) {
    console.error('[Anti-Phish Popup] Storage not available');
    document.getElementById('scanned').textContent = 'N/A';
    document.getElementById('blocked').textContent = 'N/A';
    return;
  }
  
  // Load stats from storage
  chrome.storage.local.get(['emailsScanned', 'threatsBlocked'], function(result) {
    if (chrome.runtime.lastError) {
      console.error('[Anti-Phish Popup] Storage error:', chrome.runtime.lastError);
      document.getElementById('scanned').textContent = 'Error';
      document.getElementById('blocked').textContent = 'Error';
      return;
    }
    
    const scanned = result.emailsScanned || 0;
    const blocked = result.threatsBlocked || 0;
    
    document.getElementById('scanned').textContent = scanned;
    document.getElementById('blocked').textContent = blocked;
    
    console.log('[Anti-Phish Popup] Stats loaded - Scanned:', scanned, 'Blocked:', blocked);
  });
  
  // GitHub button click handler
  const githubBtn = document.getElementById('github-btn');
  if (githubBtn) {
    githubBtn.addEventListener('click', function() {
      window.open('https://github.com/idarous4/anti-phish-extension', '_blank');
    });
  }
});
