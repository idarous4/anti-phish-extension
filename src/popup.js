// Popup script - runs when user clicks extension icon
document.addEventListener('DOMContentLoaded', function() {
  // Load stats from storage
  chrome.storage.local.get(['emailsScanned', 'threatsBlocked'], function(result) {
    const scanned = result.emailsScanned || 0;
    const blocked = result.threatsBlocked || 0;
    
    document.getElementById('scanned').textContent = scanned;
    document.getElementById('blocked').textContent = blocked;
    
    console.log('[Anti-Phish Popup] Stats loaded - Scanned:', scanned, 'Blocked:', blocked);
  });
  
  // GitHub button click handler
  document.getElementById('github-btn').addEventListener('click', function() {
    window.open('https://github.com/idarous4/anti-phish-extension', '_blank');
  });
});
