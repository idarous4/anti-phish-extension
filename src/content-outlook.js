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
  CHECK_INTERVAL: 1000,
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
  // Outlook shows email in a reading pane or full view
  // Look for email container
  const emailContainer = document.querySelector('[role="main"]');
  
  if (emailContainer) {
    // Generate a simple ID based on email content hash
    const emailContent = emailContainer.innerText.substring(0, 200);
    const emailId = btoa(emailContent).substring(0, 20);
    
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
    
    log('📧 Outlook Email:', emailData.sender, '-', emailData.subject.substring(0, 50));
    
    // Use heuristics for Outlook
    const result = runHeuristics(emailData);
    showTrustOverlay(result.score, result.issues, emailData);
    
  } catch (error) {
    log('❌ Error:', error);
  } finally {
    isAnalyzing = false;
  }
}

function extractEmailData() {
  // Outlook selectors
  let sender = 'Unknown';
  let subject = 'No Subject';
  let body = '';
  const links = [];
  
  // Try to find sender - Outlook uses different selectors
  const senderSelectors = [
    '[role="heading"] span[title]',
    '.o365cs-span span[title]',
    '[data-testid="sender-email"]',
    '.bidi'  // Outlook's sender class
  ];
  
  for (const selector of senderSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      sender = el.getAttribute('title') || el.textContent || 'Unknown';
      break;
    }
  }
  
  // Try to find subject
  const subjectSelectors = [
    '[role="heading"]',
    'h1',
    '.bidi'  // Sometimes subject is here
  ];
  
  for (const selector of subjectSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      const text = el.textContent.trim();
      if (text.length > 0 && text !== sender) {
        subject = text;
        break;
      }
    }
  }
  
  // Get email body
  const bodySelectors = [
    '[role="main"]',
    '.ReadingPaneContent',
    '#ReadingPaneContainerId'
  ];
  
  for (const selector of bodySelectors) {
    const el = document.querySelector(selector);
    if (el) {
      body = el.innerText || '';
      // Get links
      el.querySelectorAll('a').forEach(a => {
        links.push({
          text: a.innerText,
          href: a.href
        });
      });
      break;
    }
  }
  
  // Only return if we found actual content
  if (body.length < 50) {
    return null; // Probably not a real email
  }
  
  return { subject, sender, body, links };
}

function runHeuristics(emailData) {
  let score = 100;
  const issues = [];
  const body = emailData.body.toLowerCase();
  const subject = emailData.subject.toLowerCase();
  
  // Urgency words
  const urgencyWords = [
    'act immediately', 'account suspended', 'verify your account', 
    'urgent action required', 'security alert'
  ];
  
  urgencyWords.forEach(phrase => {
    if (body.includes(phrase) || subject.includes(phrase)) {
      score -= 15;
      issues.push(`⚠️ Urgency: "${phrase}"`);
    }
  });
  
  // Brand spoofing
  const senderNameEl = document.querySelector('[role="heading"] span');
  if (senderNameEl) {
    const displayName = senderNameEl.textContent.toLowerCase();
    const actualEmail = emailData.sender.toLowerCase();
    
    const spoofedBrands = ['paypal', 'apple', 'microsoft', 'amazon', 'google'];
    spoofedBrands.forEach(brand => {
      if (displayName.includes(brand) && !actualEmail.includes(brand)) {
        score -= 25;
        issues.push(`🚨 Spoof: Claims to be ${brand}`);
      }
    });
  }
  
  // Suspicious links
  emailData.links.forEach(link => {
    if (link.text && link.href) {
      const text = link.text.toLowerCase().trim();
      const href = link.href.toLowerCase();
      
      const domainMatch = text.match(/([\w-]+\.com)/);
      if (domainMatch) {
        const textDomain = domainMatch[1];
        if (!href.includes(textDomain) && 
            ['paypal.com', 'google.com', 'amazon.com'].includes(textDomain)) {
          score -= 20;
          issues.push(`🔗 Link shows "${textDomain}" but goes elsewhere`);
        }
      }
    }
  });
  
  // Sensitive info requests
  const sensitivePhrases = [
    'enter your password', 'provide your credit card', 'verify your ssn'
  ];
  
  sensitivePhrases.forEach(phrase => {
    if (body.includes(phrase)) {
      score -= 20;
      issues.push(`🔒 Requests sensitive info`);
    }
  });
  
  return { score: Math.max(0, score), issues };
}

function showTrustOverlay(score, issues, emailData) {
  // Remove existing overlay
  const existing = document.getElementById('anti-phish-overlay-outlook');
  if (existing) existing.remove();
  
  let color, icon, title;
  if (score < 30) {
    color = '#f44336';
    icon = '🔴';
    title = 'HIGH RISK';
  } else if (score < 70) {
    color = '#ff9800';
    icon = '🟡';
    title = 'MEDIUM RISK';
  } else {
    color = '#4caf50';
    icon = '🟢';
    title = 'LOW RISK';
  }
  
  const overlay = document.createElement('div');
  overlay.id = 'anti-phish-overlay-outlook';
  overlay.style.cssText = `
    position: fixed; top: 80px; right: 20px; width: 350px;
    background: #ffffff; border: 4px solid ${color}; border-radius: 12px;
    padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    z-index: 999999; font-family: system-ui; font-size: 15px;
    color: #000000;
  `;
  
  let issuesHtml = issues.length ? `
    <div style="margin: 15px 0; padding: 12px; background: #f5f5f5; border-radius: 8px;">
      <strong style="color: ${color};">⚠️ Issues:</strong>
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
    <div style="color: ${color}; font-weight: bold; margin-bottom: 8px;">${title}</div>
    <div style="font-size: 13px; color: #333; margin-bottom: 10px;">📧 ${emailData.sender}</div>
    ${issuesHtml}
    <button onclick="document.getElementById('anti-phish-overlay-outlook').remove()" 
            style="width: 100%; padding: 10px; border: none; border-radius: 6px; 
                   background: ${color}; color: white; cursor: pointer; font-weight: 600;">Dismiss</button>
  `;
  
  document.body.appendChild(overlay);
  
  log('✅ Outlook overlay displayed');
}

// Run on Outlook
if (window.location.hostname.includes('outlook')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
