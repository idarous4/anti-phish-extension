/**
 * ============================================================================
 * CONTENT SCRIPT FOR OUTLOOK
 * ============================================================================
 * Works with: outlook.live.com and outlook.office.com
 * ============================================================================
 */

const CONFIG = {
  CHECK_INTERVAL: 1000,
  DEBUG: true
};

let currentEmailId = null;
let isAnalyzing = false;
let lastEmailContent = '';

function log(...args) {
  if (CONFIG.DEBUG) {
    console.log('[Anti-Phish Outlook]', ...args);
  }
}

function init() {
  log('🛡️ Anti-Phish Shield loaded on Outlook');
  log('📍 URL:', window.location.href);
  
  // Start watching immediately
  watchForEmailOpens();
  
  // Initial check after delay
  setTimeout(() => {
    log('🔍 Running initial check...');
    checkForOpenEmail();
  }, 3000);
}

function watchForEmailOpens() {
  let lastUrl = window.location.href;
  
  // Watch for URL changes (Outlook uses hash routing)
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      log('🔄 URL changed, checking for new email...');
      setTimeout(checkForOpenEmail, 1000);
    }
  }, 500);
  
  // Watch for DOM changes
  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        // Check if any added node might be email content
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) { // Element node
            const text = node.innerText || node.textContent || '';
            if (text.length > 100 && text.includes('@')) {
              shouldCheck = true;
              break;
            }
          }
        }
      }
      if (shouldCheck) break;
    }
    
    if (shouldCheck && !isAnalyzing) {
      setTimeout(checkForOpenEmail, 800);
    }
  });
  
  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    characterData: true 
  });
  
  log('👀 Watching for email opens...');
}

function checkForOpenEmail() {
  if (isAnalyzing) {
    log('⏳ Already analyzing, skipping...');
    return;
  }
  
  // Get email content from various possible containers
  const emailData = extractEmailData();
  
  if (!emailData) {
    log('❌ Could not extract email data');
    return;
  }
  
  // Generate ID from content
  const contentHash = btoa(emailData.sender + emailData.subject).substring(0, 20);
  
  if (contentHash === currentEmailId) {
    log('📧 Same email, skipping');
    return;
  }
  
  if (contentHash === 'AAAAAAAAAAAAAAAAAAAA' || contentHash.includes('undefined')) {
    log('❌ Invalid email ID generated');
    return;
  }
  
  currentEmailId = contentHash;
  
  log('✅ Email detected!');
  log('   From:', emailData.sender);
  log('   Subject:', emailData.subject.substring(0, 50));
  log('   Body length:', emailData.body.length);
  
  isAnalyzing = true;
  
  setTimeout(() => {
    analyzeEmail(emailData);
  }, 500);
}

function extractEmailData() {
  let sender = null;
  let subject = null;
  let body = '';
  const links = [];
  
  // === TRY TO FIND SENDER ===
  // Method 1: Look for email addresses in the page
  const allText = document.body.innerText;
  const emailMatches = allText.match(/[\w.-]+@[\w.-]+\.\w+/g);
  
  // Try to find sender in various elements
  const senderSelectors = [
    // New Outlook (React-based)
    '[data-testid="message-header-from"]',
    '[data-testid="sender-email"]',
    '[aria-label*="From"] [title]',
    '[aria-label*="From"]',
    
    // Classic Outlook
    '.bidi[title]',
    '.o365cs-span[title]',
    '.sender-email',
    
    // Generic
    '[role="main"] span[email]',
    '[role="article"] [title*="@"]',
    
    // Reading pane specific
    '.ReadingPaneContent [title*="@"]',
    '#ReadingPaneContainerId [title*="@"]'
  ];
  
  for (const selector of senderSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      const text = el.getAttribute('title') || el.textContent || '';
      if (text.includes('@')) {
        sender = text.trim();
        log('🔍 Found sender via selector:', selector);
        break;
      }
    }
  }
  
  // Fallback: Use first email found in content
  if (!sender && emailMatches && emailMatches.length > 0) {
    // Filter out common false positives
    const validEmails = emailMatches.filter(e => 
      !e.includes('example.com') && 
      !e.includes('test.com') &&
      e.length > 5
    );
    if (validEmails.length > 0) {
      sender = validEmails[0];
      log('🔍 Found sender via text search');
    }
  }
  
  // === TRY TO FIND SUBJECT ===
  const subjectSelectors = [
    '[data-testid="message-header-subject"]',
    '[aria-label="Subject"]',
    'h1',
    '[role="heading"]',
    '.subject-line',
    '.bidi' // Sometimes subject is here in classic Outlook
  ];
  
  for (const selector of subjectSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      const text = el.textContent.trim();
      if (text.length > 0 && text.length < 300 && !text.includes('@')) {
        subject = text;
        log('🔍 Found subject via selector:', selector);
        break;
      }
    }
  }
  
  // === TRY TO FIND BODY ===
  const bodySelectors = [
    '[data-testid="message-body"]',
    '.ReadingPaneContent',
    '#ReadingPaneContainerId',
    '[role="main"] .customScrollBar',
    '[role="article"]',
    '.message-content'
  ];
  
  let bodyEl = null;
  for (const selector of bodySelectors) {
    bodyEl = document.querySelector(selector);
    if (bodyEl) {
      log('🔍 Found body via selector:', selector);
      break;
    }
  }
  
  if (bodyEl) {
    body = bodyEl.innerText || '';
    
    // Get links
    bodyEl.querySelectorAll('a').forEach(a => {
      if (a.href && !a.href.startsWith('javascript:') && !a.href.startsWith('#')) {
        links.push({
          text: a.innerText || a.href,
          href: a.href
        });
      }
    });
  }
  
  // Validate we have enough data
  if (!sender || !subject || body.length < 20) {
    log('❌ Incomplete email data:', { 
      sender: sender || 'MISSING', 
      subject: subject || 'MISSING', 
      bodyLength: body.length 
    });
    return null;
  }
  
  return { sender, subject, body, links };
}

function analyzeEmail(emailData) {
  try {
    log('🤖 Analyzing email...');
    
    const result = runHeuristics(emailData);
    
    log('📊 Score:', result.score, '| Issues:', result.issues.length);
    
    showOverlay(result.score, result.issues, emailData);
    updateStats(result.score);
    
  } catch (error) {
    log('❌ Analysis error:', error);
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
  const urgencyWords = ['urgent', 'immediately', 'act now', 'verify', 'suspended', 
    'security alert', 'unusual activity', 'confirm', 'limited time', 'expires'];
  
  urgencyWords.forEach(word => {
    if (body.includes(word) || subject.includes(word)) {
      score -= 10;
      issues.push(`⚠️ Urgency: "${word}"`);
    }
  });
  
  // Suspicious sender
  if (sender.includes('no-reply') || sender.includes('alert') || sender.includes('security')) {
    score -= 10;
    issues.push(`🚨 Suspicious sender pattern`);
  }
  
  // Generic greetings
  if (body.includes('dear customer') || body.includes('dear user')) {
    score -= 8;
    issues.push(`👤 Generic greeting`);
  }
  
  // Sensitive requests
  if (body.includes('password') || body.includes('verify your account')) {
    score -= 15;
    issues.push(`🔒 Requests sensitive info`);
  }
  
  // Suspicious links
  emailData.links.forEach(link => {
    if (link.href && (link.href.includes('bit.ly') || link.href.includes('tinyurl'))) {
      score -= 8;
      issues.push(`⚡ Shortened URL`);
    }
  });
  
  return { score: Math.max(0, score), issues };
}

function showOverlay(score, issues, emailData) {
  removeExistingOverlay();
  
  let color, title;
  if (score < 30) {
    color = '#f44336';
    title = 'HIGH RISK';
  } else if (score < 70) {
    color = '#ff9800';
    title = 'MEDIUM RISK';
  } else {
    color = '#4caf50';
    title = 'LOW RISK';
  }
  
  const overlay = document.createElement('div');
  overlay.id = 'anti-phish-outlook-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 350px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
  `;
  
  overlay.innerHTML = `
    <div style="height: 6px; background: ${color};"></div>
    <div style="padding: 20px;">
      <div style="display: flex; align-items: center; margin-bottom: 15px;">
        <div style="width: 60px; height: 60px; border-radius: 50%; 
                    background: conic-gradient(${color} ${score}%, #e0e0e0 ${score}%);
                    display: flex; align-items: center; justify-content: center;
                    margin-right: 15px;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: white;
                      display: flex; align-items: center; justify-content: center;
                      font-size: 16px; font-weight: bold; color: ${color};">
            ${score}
          </div>
        </div>
        <div>
          <div style="font-size: 12px; color: #666;">Trust Score</div>
          <div style="font-size: 18px; font-weight: bold; color: ${color};">${title}</div>
        </div>
      </div>
      
      <div style="background: #f5f5f5; border-radius: 8px; padding: 10px; margin-bottom: 15px;">
        <div style="font-size: 11px; color: #888;">From</div>
        <div style="font-size: 13px; color: #333; font-weight: 500;">${emailData.sender}</div>
      </div>
      
      ${issues.length > 0 ? `
        <div style="background: #fafafa; border-radius: 8px; padding: 12px; margin-bottom: 15px;">
          <div style="font-size: 11px; color: ${color}; font-weight: bold; margin-bottom: 8px;">
            ⚠️ ${issues.length} Issue(s) Found
          </div>
          ${issues.map(i => `
            <div style="font-size: 12px; color: #555; padding: 4px 0; border-bottom: 1px solid #eee;">
              ${i}
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <button id="aph-outlook-dismiss" style="
        width: 100%; padding: 12px; border: none; border-radius: 8px;
        background: ${color}; color: white; font-weight: 600; cursor: pointer;
      ">Dismiss</button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  document.getElementById('aph-outlook-dismiss').addEventListener('click', () => {
    overlay.remove();
  });
  
  log('✅ Overlay displayed');
}

function removeExistingOverlay() {
  const existing = document.getElementById('anti-phish-outlook-overlay');
  if (existing) existing.remove();
}

function updateStats(score) {
  try {
    if (!chrome.storage || !chrome.storage.local) return;
    
    chrome.storage.local.get(['scanned', 'blocked'], function(result) {
      if (chrome.runtime.lastError) return;
      
      const scanned = (result.scanned || 0) + 1;
      const blocked = (result.blocked || 0) + (score < 30 ? 1 : 0);
      
      chrome.storage.local.set({ scanned, blocked });
      log('📊 Stats updated:', scanned, 'scanned,', blocked, 'blocked');
    });
  } catch (e) {}
}

// Initialize
if (window.location.hostname.includes('outlook')) {
  log('🚀 Outlook detected, initializing...');
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
