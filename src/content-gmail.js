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
  const sender = emailData.sender.toLowerCase();
  
  // Urgency words - only high-confidence phishing words
  const urgencyWords = [
    'act immediately', 'account suspended', 'verify your account', 
    'urgent action required', 'security alert', 'unusual activity',
    'confirm your identity', 'limited time offer expires'
  ];
  
  urgencyWords.forEach(phrase => {
    if (body.includes(phrase) || subject.includes(phrase)) {
      score -= 15;
      issues.push(`⚠️ Urgency phrase detected`);
    }
  });
  
  // Brand spoofing - only if sender CLAIMS to be a brand but isn't
  // Check sender display name vs actual email domain
  const senderNameEl = document.querySelector('h3 span[email]');
  if (senderNameEl) {
    const displayName = senderNameEl.textContent.toLowerCase();
    const actualEmail = senderNameEl.getAttribute('email') || '';
    
    // If display name says "PayPal" but email is @gmail.com
    const spoofedBrands = ['paypal', 'apple', 'microsoft', 'amazon', 'google', 'bank'];
    spoofedBrands.forEach(brand => {
      if (displayName.includes(brand) && !actualEmail.includes(brand + '.com')) {
        score -= 25;
        issues.push(`🚨 Brand spoof: Claims to be ${brand}`);
      }
    });
  }
  
  // Suspicious links - only if clearly deceptive
  emailData.links.forEach(link => {
    if (link.text && link.href) {
      const text = link.text.toLowerCase().trim();
      const href = link.href.toLowerCase();
      
      // Only flag if link TEXT shows a domain but goes somewhere completely different
      // Example: text shows "paypal.com" but href goes to "evil-site.com"
      const domainMatch = text.match(/([\w-]+\.com)/);
      if (domainMatch) {
        const textDomain = domainMatch[1]; // e.g., "paypal.com"
        if (!href.includes(textDomain) && 
            (textDomain === 'paypal.com' || textDomain === 'google.com' || 
             textDomain === 'amazon.com' || textDomain === 'microsoft.com' ||
             textDomain === 'apple.com' || textDomain === 'facebook.com')) {
          score -= 20;
          issues.push(`🔗 Link shows "${textDomain}" but goes elsewhere`);
        }
      }
    }
  });
  
  // Requests for sensitive info
  const sensitivePhrases = [
    'enter your password', 'provide your credit card', 'verify your ssn',
    'confirm your bank details', 'update your payment information'
  ];
  
  sensitivePhrases.forEach(phrase => {
    if (body.includes(phrase)) {
      score -= 20;
      issues.push(`🔒 Requests sensitive information`);
    }
  });
  
  return { score: Math.max(0, score), issues };
}

function showTrustOverlay(score, issues, emailData) {
  removeExistingOverlay();
  
  let color, icon, title, bgColor;
  if (score < 30) {
    color = '#f44336'; // Red
    bgColor = '#ffebee'; // Light red background
    icon = '🔴';
    title = 'HIGH RISK - Likely Phishing';
  } else if (score < 70) {
    color = '#ff9800'; // Orange
    bgColor = '#fff3e0'; // Light orange background
    icon = '🟡';
    title = 'MEDIUM RISK - Be Cautious';
  } else {
    color = '#4caf50'; // Green
    bgColor = '#e8f5e9'; // Light green background
    icon = '🟢';
    title = 'LOW RISK - Appears Safe';
  }
  
  const overlay = document.createElement('div');
  overlay.id = 'anti-phish-overlay';
  overlay.style.cssText = `
    position: fixed; top: 80px; right: 20px; width: 380px;
    background: ${bgColor}; border: 4px solid ${color}; border-radius: 12px;
    padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
    font-size: 15px; color: #212121;
  `;
  
  let issuesHtml = issues.length ? `
    <div style="margin: 15px 0; padding: 15px; background: #ffffff; border-radius: 8px; border-left: 4px solid ${color}; color: #212121;">
      <strong style="color: ${color}; font-size: 14px;">⚠️ Issues Found:</strong>
      <ul style="margin: 10px 0 0 20px; padding: 0; color: #212121; font-size: 14px;">
        ${issues.map(i => `<li style="margin-bottom: 6px;">${i}</li>`).join('')}
      </ul>
    </div>
  ` : '';
  
  overlay.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 15px;">
      <span style="font-size: 32px; margin-right: 12px;">${icon}</span>
      <div>
        <div style="font-size: 28px; font-weight: bold; color: ${color};">${score}/100</div>
        <div style="font-size: 13px; color: #555;">Trust Score</div>
      </div>
    </div>
    <div style="color: ${color}; font-weight: bold; font-size: 16px; margin-bottom: 10px; text-transform: uppercase;">${title}</div>
    <div style="font-size: 14px; color: #212121; margin-bottom: 15px; font-weight: 500;">📧 From: ${emailData.sender}</div>
    ${issuesHtml}
    <div style="display: flex; gap: 10px; margin-top: 15px;">
      <button id="aph-dismiss" style="flex: 1; padding: 12px; border: 2px solid #bbb; border-radius: 8px; background: #ffffff; color: #333; cursor: pointer; font-weight: 600; font-size: 14px;">Dismiss</button>
      <button id="aph-report" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: ${color}; color: white; cursor: pointer; font-weight: 600; font-size: 14px;">Report</button>
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
      // Only count as blocked if HIGH risk (score < 30), not medium
      const blocked = (r.blocked || 0) + (score < 30 ? 1 : 0);
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
