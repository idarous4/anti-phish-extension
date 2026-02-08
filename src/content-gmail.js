/**
 * ============================================================================
 * CONTENT SCRIPT FOR GMAIL - SIMPLIFIED STABLE VERSION
 * ============================================================================
 */

// Configuration
const CONFIG = {
  RISK_THRESHOLD: 50,
  CHECK_INTERVAL: 1000,
  DEBUG: true
};

let currentEmailId = null;
let isAnalyzing = false;

function log(...args) {
  if (CONFIG.DEBUG) {
    console.log('[Anti-Phish]', ...args);
  }
}

function init() {
  log('🛡️ Anti-Phish Shield loaded');
  watchForEmailOpens();
  checkForOpenEmail();
}

function watchForEmailOpens() {
  const observer = new MutationObserver(() => {
    checkForOpenEmail();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setInterval(checkForOpenEmail, CONFIG.CHECK_INTERVAL);
}

function checkForOpenEmail() {
  const url = window.location.href;
  const emailMatch = url.match(/#(inbox|sent|spam|trash)\/([a-zA-Z0-9]+)/);
  
  if (emailMatch) {
    const emailId = emailMatch[2];
    if (emailId !== currentEmailId && !isAnalyzing) {
      currentEmailId = emailId;
      setTimeout(analyzeCurrentEmail, 500);
    }
  }
}

function analyzeCurrentEmail() {
  if (isAnalyzing) return;
  isAnalyzing = true;
  
  try {
    const emailData = extractEmailData();
    if (!emailData) {
      isAnalyzing = false;
      return;
    }
    
    log('📧 Email:', emailData.sender, '-', emailData.subject.substring(0, 50));
    
    const result = runHeuristics(emailData);
    showTrustOverlay(result.score, result.issues, emailData);
    updateStats(result.score);
    
  } catch (error) {
    log('❌ Error:', error);
  } finally {
    isAnalyzing = false;
  }
}

function extractEmailData() {
  // Get sender - try multiple methods
  let sender = 'Unknown';
  const senderEl = document.querySelector('h3 span[email]') || 
                   document.querySelector('[role="main"] span[email]') ||
                   document.querySelector('span[email]');
  if (senderEl) {
    sender = senderEl.getAttribute('email') || senderEl.textContent;
  }
  
  // Get subject
  const subjectEl = document.querySelector('h2[data-legacy-thread-id]');
  const subject = subjectEl ? subjectEl.innerText.trim() : 'No Subject';
  
  // Get body
  const bodyEl = document.querySelector('.a3s.aiL');
  const body = bodyEl ? bodyEl.innerText.trim() : '';
  
  // Get links
  const links = [];
  if (bodyEl) {
    bodyEl.querySelectorAll('a').forEach(a => {
      links.push({ text: a.innerText, href: a.href });
    });
  }
  
  return { subject, sender, body, links };
}

function runHeuristics(emailData) {
  let score = 100;
  const issues = [];
  const body = emailData.body.toLowerCase();
  const subject = emailData.subject.toLowerCase();
  
  // Urgency words
  const urgency = ['urgent', 'immediately', 'act now', 'verify now', 'suspended'];
  urgency.forEach(word => {
    if (body.includes(word) || subject.includes(word)) {
      score -= 10;
      issues.push(`Urgency: "${word}"`);
    }
  });
  
  // Brand spoofing
  const brands = ['paypal', 'apple', 'amazon', 'microsoft', 'google'];
  brands.forEach(brand => {
    if ((body.includes(brand) || subject.includes(brand)) && 
        !emailData.sender.includes(brand)) {
      score -= 20;
      issues.push(`Spoof: Claims ${brand}`);
    }
  });
  
  // Suspicious links
  emailData.links.forEach(link => {
    if (link.text && link.href && !link.href.includes(link.text.substring(0, 10))) {
      score -= 15;
      issues.push(`Link mismatch`);
    }
  });
  
  return { score: Math.max(0, score), issues };
}

function showTrustOverlay(score, issues, emailData) {
  removeExistingOverlay();
  
  let color = score < 30 ? '#f44336' : score < 70 ? '#ff9800' : '#4caf50';
  let icon = score < 30 ? '🔴' : score < 70 ? '🟡' : '🟢';
  let title = score < 30 ? 'HIGH RISK' : score < 70 ? 'MEDIUM RISK' : 'LOW RISK';
  
  const overlay = document.createElement('div');
  overlay.id = 'anti-phish-overlay';
  overlay.style.cssText = `
    position: fixed; top: 80px; right: 20px; width: 350px;
    background: white; border: 4px solid ${color}; border-radius: 12px;
    padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    z-index: 999999; font-family: system-ui; font-size: 15px;
  `;
  
  let issuesHtml = issues.length ? `
    <div style="margin: 15px 0; padding: 12px; background: #fff3e0; border-radius: 8px;">
      <strong style="color: #e65100;">⚠️ Issues:</strong>
      <ul style="margin: 8px 0 0 20px; padding: 0;">
        ${issues.map(i => `<li>${i}</li>`).join('')}
      </ul>
    </div>
  ` : '';
  
  overlay.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 10px;">
      <span style="font-size: 28px; margin-right: 10px;">${icon}</span>
      <div>
        <div style="font-size: 26px; font-weight: bold; color: ${color};">${score}/100</div>
        <div style="font-size: 12px; color: #666;">Trust Score</div>
      </div>
    </div>
    <div style="color: ${color}; font-weight: bold; font-size: 16px; margin-bottom: 8px;">${title}</div>
    <div style="font-size: 14px; color: #555; margin-bottom: 10px;">📧 ${emailData.sender}</div>
    ${issuesHtml}
    <div style="display: flex; gap: 10px; margin-top: 15px;">
      <button id="aph-dismiss" style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; background: #f5f5f5; cursor: pointer; font-weight: 600;">Dismiss</button>
      <button id="aph-report" style="flex: 1; padding: 10px; border: none; border-radius: 6px; background: ${color}; color: white; cursor: pointer; font-weight: 600;">Report</button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  document.getElementById('aph-dismiss').onclick = () => overlay.remove();
  document.getElementById('aph-report').onclick = () => {
    alert('Reported! Thanks for helping.');
  };
}

function removeExistingOverlay() {
  const existing = document.getElementById('anti-phish-overlay');
  if (existing) existing.remove();
}

function updateStats(score) {
  try {
    chrome.storage.local.get(['scanned', 'blocked'], (r) => {
      const scanned = (r.scanned || 0) + 1;
      const blocked = (r.blocked || 0) + (score < 50 ? 1 : 0);
      chrome.storage.local.set({ scanned, blocked });
      log('📊 Stats:', scanned, 'scanned,', blocked, 'blocked');
    });
  } catch (e) {
    log('⚠️ Stats error:', e);
  }
}

if (window.location.hostname.includes('mail.google.com')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
