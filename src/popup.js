// Popup script - runs when user clicks extension icon
document.addEventListener('DOMContentLoaded', function() {
  // Initialize stats
  document.getElementById('scanned').textContent = '0';
  document.getElementById('blocked').textContent = '0';
  
  // GitHub button click handler
  document.getElementById('github-btn').addEventListener('click', function() {
    window.open('https://github.com/idarous4/anti-phish-extension', '_blank');
  });
});
