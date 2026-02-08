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
  
  // Initialize AI model
  initAIModel().then(() => {
    log('🤖 AI ready');
  });
  
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

async function analyzeCurrentEmail() {
  if (isAnalyzing) return;
  isAnalyzing = true;
  
  try {
    const emailData = extractEmailData();
    if (!emailData) {
      isAnalyzing = false;
      return;
    }
    
    log('📧 Email:', emailData.sender, '-', emailData.subject.substring(0, 50));
    
    // Check if AI is available
    if (modelLoaded) {
      log('🤖 Using AI + Heuristics detection...');
    } else {
      log('📋 Using heuristic detection only (AI not loaded)...');
    }
    
    // Use combined AI + Heuristics detection
    const result = await combinedDetection(emailData);
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
  
  let color, icon, title;
  if (score < 30) {
    color = '#f44336'; // Red
    icon = '🔴';
    title = 'HIGH RISK - Likely Phishing';
  } else if (score < 70) {
    color = '#ff9800'; // Orange
    icon = '🟡';
    title = 'MEDIUM RISK - Be Cautious';
  } else {
    color = '#4caf50'; // Green
    icon = '🟢';
    title = 'LOW RISK - Appears Safe';
  }
  
  const overlay = document.createElement('div');
  overlay.id = 'anti-phish-overlay';
  overlay.style.cssText = `
    position: fixed; top: 80px; right: 20px; width: 380px;
    background: #ffffff; border: 4px solid ${color}; border-radius: 12px;
    padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
    font-size: 15px; color: #000000;
  `;
  
  let issuesHtml = '';
  if (issues.length > 0) {
    const issuesWithExplanations = issues.map(issue => {
      let explanation = '';
      if (issue.includes('Urgency')) {
        explanation = 'Phishing emails create fake urgency to pressure you into acting quickly.';
      } else if (issue.includes('Spoof') || issue.includes('Brand')) {
        explanation = 'Scammers impersonate trusted brands. Check the sender email carefully.';
      } else if (issue.includes('Link')) {
        explanation = 'Hover over links to see the real destination before clicking.';
      } else if (issue.includes('sensitive') || issue.includes('password')) {
        explanation = 'Legitimate companies NEVER ask for passwords via email.';
      }
      return { text: issue, explanation };
    });
    
    issuesHtml = `
      <div style="margin: 15px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; border-left: 4px solid ${color};">
        <strong style="color: ${color}; font-size: 14px;">⚠️ Issues Found:</strong>
        <ul style="margin: 10px 0 0 20px; padding: 0; color: #000000; font-size: 14px;">
          ${issuesWithExplanations.map(i => `
            <li style="margin-bottom: 10px;">
              <div style="font-weight: 500;">${i.text}</div>
              ${i.explanation ? `<div style="font-size: 12px; color: #555; margin-top: 4px; font-style: italic;">💡 ${i.explanation}</div>` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }
  
  overlay.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 15px;">
      <span style="font-size: 32px; margin-right: 12px;">${icon}</span>
      <div>
        <div style="font-size: 28px; font-weight: bold; color: ${color};">${score}/100</div>
        <div style="font-size: 13px; color: #333;">Trust Score</div>
      </div>
    </div>
    <div style="color: ${color}; font-weight: bold; font-size: 16px; margin-bottom: 10px; text-transform: uppercase;">${title}</div>
    <div style="font-size: 14px; color: #000000; margin-bottom: 15px; font-weight: 500;">📧 From: ${emailData.sender}</div>
    ${issuesHtml}
    <div style="display: flex; gap: 10px; margin-top: 15px;">
      <button id="aph-dismiss" style="flex: 1; padding: 12px; border: 2px solid #999; border-radius: 8px; background: #fff; color: #000; cursor: pointer; font-weight: 600; font-size: 14px;">Dismiss</button>
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
    // Check if chrome.storage is available
    if (!chrome.storage || !chrome.storage.local) {
      log('⚠️ Storage not available');
      return;
    }
    
    chrome.storage.local.get(['scanned', 'blocked'], (r) => {
      // Check for runtime errors (extension context invalidated)
      if (chrome.runtime.lastError) {
        log('⚠️ Storage error (extension may have reloaded)');
        return;
      }
      
      const scanned = (r?.scanned || 0) + 1;
      const blocked = (r?.blocked || 0) + (score < 30 ? 1 : 0);
      
      chrome.storage.local.set({ scanned, blocked }, () => {
        if (chrome.runtime.lastError) {
          // Silent fail - extension context may have changed
          return;
        }
        log('📊 Stats:', scanned, 'scanned,', blocked, 'blocked');
      });
    });
  } catch (e) {
    // Silent fail - don't spam console
  }
}

if (window.location.hostname.includes('mail.google.com')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
