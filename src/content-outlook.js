/**
 * ============================================================================
 * CONTENT SCRIPT FOR OUTLOOK
 * ============================================================================
 * 
 * This script runs INSIDE Outlook's webpage and detects phishing emails.
 * Works with: outlook.live.com and outlook.office.com
 * ============================================================================
 */

// Configuration
const CONFIG = {
  RISK_THRESHOLD: 50,
  CHECK_INTERVAL: 1500,
  DEBUG: true
};

let currentEmailId = null;
let isAnalyzing = false;

function log(...args) {
  if (CONFIG.DEBUG) {
    console.log('[Anti-Phish Outlook]', ...args);
  }
}

function init() {
  log('🛡️ Anti-Phish Shield loaded on Outlook');
  watchForEmailOpens();
  // Delay first check to let Outlook load
  setTimeout(checkForOpenEmail, 2000);
}

function watchForEmailOpens() {
  const observer = new MutationObserver((mutations) => {
    // Check if email content changed
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        setTimeout(checkForOpenEmail, 500);
        break;
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setInterval(checkForOpenEmail, CONFIG.CHECK_INTERVAL);
}

function checkForOpenEmail() {
  // Outlook uses different selectors - try multiple
  const emailContainer = document.querySelector('.ReadingPaneContent, [role="main"] .customScrollBar, #ReadingPaneContainerId, [data-testid="reading-pane"]');
  
  if (!emailContainer) {
    return;
  }
  
  // Get email content to generate ID
  const emailText = emailContainer.innerText || '';
  if (emailText.length < 50) return; // Too short, probably not an email
  
  // Generate ID from sender + subject
  const sender = extractSender();
  const subject = extractSubject();
  const emailId = btoa(sender + subject).substring(0, 20);
  
  if (emailId !== currentEmailId && !isAnalyzing && emailId !== 'AAAAAAAAAAAAAAAAAAAA') {
    currentEmailId = emailId;
    log('📧 New email detected:', subject.substring(0, 40));
    setTimeout(() => analyzeCurrentEmail(sender, subject, emailText), 800);
  }
}

function extractSender() {
  // Try multiple selectors for Outlook sender
  const selectors = [
    '.o365cs-span[title]',
    '[data-testid="sender-email"]',
    '.bidi[title]',
    '[role="heading"] span[title]',
    '.o365cs-fm bt b tc',
    '[aria-label*="From"]'
  ];
  
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) {
      const email = el.getAttribute('title') || el.textContent;
      if (email && email.includes('@')) {
        return email.trim();
      }
    }
  }
  
  // Try to find any email pattern in the header
  const header = document.querySelector('.ReadingPaneContent, [role="main"]');
  if (header) {
    const emailMatch = header.textContent.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) return emailMatch[0];
  }
  
  return 'Unknown';
}

function extractSubject() {
  const selectors = [
    '[role="heading"]',
    'h1',
    '[data-testid="subject"]',
    '.bidi'  // Sometimes subject is here
  ];
  
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) {
      const text = el.textContent.trim();
      if (text && text.length > 0 && text.length < 200) {
        return text;
      }
    }
  }
  
  return 'No Subject';
}

function analyzeCurrentEmail(sender, subject, bodyText) {
  if (isAnalyzing) return;
  isAnalyzing = true;
  
  try {
    log('📧 Analyzing:', sender, '-', subject.substring(0, 50));
    
    // Get links
    const emailContainer = document.querySelector('.ReadingPaneContent, [role="main"] .customScrollBar, #ReadingPaneContainerId');
    const links = [];
    if (emailContainer) {
      emailContainer.querySelectorAll('a').forEach(a => {
        if (a.href && !a.href.startsWith('javascript:')) {
          links.push({ text: a.innerText || a.href, href: a.href });
        }
      });
    }
    
    const emailData = { subject, sender, body: bodyText, links };
    
    // Use heuristics
    const result = runHeuristics(emailData);
    showTrustOverlay(result.score, result.issues, emailData);
    
  } catch (error) {
    log('❌ Error:', error);
  } finally {
    isAnalyzing = false;
  }
}

function runHeuristics(emailData) {
  let score = 100;
  const issues = [];
  const body = emailData.body.toLowerCase();
  const subject = emailData.subject.toLowerCase();
  const sender = emailData.sender.toLowerCase();
  
  // Urgency words
  const urgencyWords = ['urgent', 'immediately', 'act now', 'verify', 'suspended', 'security alert', 'unusual activity', 'confirm', 'limited time', 'expires', 'deadline', 'asap', 'emergency', 'warning'];
  
  urgencyWords.forEach(word => {
    if (body.includes(word) || subject.includes(word)) {
      score -= 10;
      issues.push(`⚠️ Urgency: "${word}"`);
    }
  });
  
  // Suspicious sender patterns
  if (sender.includes('no-reply') || sender.includes('noreply')) {
    score -= 5;
    issues.push(`📧 No-reply sender`);
  }
  
  if (sender.includes('alert') || sender.includes('security') || sender.includes('verify')) {
    score -= 10;
    issues.push(`🚨 Suspicious sender name`);
  }
  
  // Generic greetings
  const genericGreetings = ['dear customer', 'dear user', 'dear client', 'valued customer'];
  genericGreetings.forEach(greeting => {
    if (body.includes(greeting)) {
      score -= 8;
      issues.push(`👤 Generic greeting: "${greeting}"`);
    }
  });
  
  // Requests for sensitive info
  const sensitiveRequests = ['password', 'credit card', 'ssn', 'social security', 'bank account', 'verify your account', 'confirm your identity', 'update your information', 'click here to verify'];
  
  sensitiveRequests.forEach(request => {
    if (body.includes(request)) {
      score -= 15;
      issues.push(`🔒 Requests: "${request}"`);
    }
  });
  
  // Suspicious links
  emailData.links.forEach(link => {
    if (link.text && link.href) {
      const text = link.text.toLowerCase().trim();
      const href = link.href.toLowerCase();
      
      if ((text.includes('click here') || text.includes('verify')) && !href.includes('google.com') && !href.includes('microsoft.com')) {
        score -= 10;
        issues.push(`🔗 Suspicious link text`);
      }
      
      if (href.includes('bit.ly') || href.includes('tinyurl') || href.includes('t.co')) {
        score -= 8;
        issues.push(`⚡ Shortened URL detected`);
      }
    }
  });
  
  return { score: Math.max(0, score), issues };
}

function showTrustOverlay(score, issues, emailData) {
  removeExistingOverlay();
  
  let color, title;
  if (score < 30) {
    color = '#f44336';
    title = 'HIGH RISK - Likely Phishing';
  } else if (score < 70) {
    color = '#ff9800';
    title = 'MEDIUM RISK - Be Cautious';
  } else {
    color = '#4caf50';
    title = 'LOW RISK - Appears Safe';
  }
  
  const overlay = document.createElement('div');
  overlay.id = 'anti-phish-overlay-outlook';
  overlay.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 360px;
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 25px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.05);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
    animation: aph-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  `;
  
  if (!document.getElementById('aph-styles')) {
    const style = document.createElement('style');
    style.id = 'aph-styles';
    style.textContent = `
      @keyframes aph-slide-in {
        from { opacity: 0; transform: translateX(100px) scale(0.95); }
        to { opacity: 1; transform: translateX(0) scale(1); }
      }
    `;
    document.head.appendChild(style);
  }
  
  overlay.innerHTML = `
    <div style="height: 8px; background: ${color};"></div>
    <div style="padding: 24px;">
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <div style="
          width: 70px; height: 70px; border-radius: 50%; 
          background: conic-gradient(${color} ${score}%, #e8e8e8 ${score}%);
          display: flex; align-items: center; justify-content: center;
          margin-right: 16px; flex-shrink: 0;
        ">
          <div style="
            width: 56px; height: 56px; border-radius: 50%; background: white;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px; font-weight: 700; color: ${color};">${score}</div>
        </div>
        <div>
          <div style="font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Trust Score</div>
          <div style="font-size: 18px; font-weight: 700; color: ${color};">${title}</div>
        </div>
      </div>
      
      <div style="background: #f7f7f7; border-radius: 12px; padding: 12px 16px; margin-bottom: ${issues.length > 0 ? '16px' : '20px'};">
        <span style="font-size: 18px; margin-right: 10px;">📧</span>
        <div style="display: inline-block;">
          <div style="font-size: 11px; color: #888; text-transform: uppercase;">Sender</div>
          <div style="font-size: 14px; color: #333; font-weight: 500;">${emailData.sender}</div>
        </div>
      </div>
      
      ${issues.length > 0 ? `
        <div style="background: #fafafa; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <div style="font-size: 12px; color: ${color}; font-weight: 700; text-transform: uppercase; margin-bottom: 12px;">
            ⚠️ ${issues.length} Issue${issues.length > 1 ? 's' : ''} Detected
          </div>
          ${issues.map(i => `
            <div style="display: flex; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #eee;">
              <span style="margin-right: 10px; flex-shrink: 0;">${i.split(' ')[0]}</span>
              <span style="font-size: 13px; color: #444; line-height: 1.4;">${i.substring(i.indexOf(' ') + 1)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <div style="display: flex; gap: 12px;">
        <button id="aph-dismiss-outlook" style="flex: 1; padding: 14px; border: 1.5px solid #ddd; border-radius: 12px; background: #fff; color: #555; cursor: pointer; font-weight: 600; font-size: 14px;">Dismiss</button>
        <button id="aph-report-outlook" style="flex: 1; padding: 14px; border: none; border-radius: 12px; background: ${color}; color: white; cursor: pointer; font-weight: 600; font-size: 14px;">Report</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  document.getElementById('aph-dismiss-outlook').onclick = () => overlay.remove();
  document.getElementById('aph-report-outlook').onclick = () => {
    alert('📧 Reported! Thanks for helping.');
    overlay.remove();
  };
  
  updateStats(score);
  
  log('✅ Outlook overlay displayed');
}

function removeExistingOverlay() {
  const existing = document.getElementById('anti-phish-overlay-outlook');
  if (existing) existing.remove();
}

function updateStats(score) {
  try {
    if (!chrome.runtime || !chrome.runtime.id) return;
    
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['scanned', 'blocked'], function(result) {
        if (chrome.runtime.lastError) return;
        
        let scanned = (result.scanned || 0) + 1;
        let blocked = (result.blocked || 0) + (score < 30 ? 1 : 0);
        
        chrome.storage.local.set({ scanned, blocked });
      });
    }
  } catch (e) {}
}

// Run on Outlook
if (window.location.hostname.includes('outlook')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
