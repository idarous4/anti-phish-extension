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

  // Urgency words - BROADER detection
  const urgencyWords = [
    'urgent', 'immediately', 'act now', 'verify', 'suspended',
    'security alert', 'unusual activity', 'confirm', 'limited time',
    'expires', 'deadline', 'asap', 'emergency', 'warning'
  ];

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
  const sensitiveRequests = [
    'password', 'credit card', 'ssn', 'social security',
    'bank account', 'verify your account', 'confirm your identity',
    'update your information', 'click here to verify'
  ];

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

      // Check for URL mismatches
      if ((text.includes('click here') || text.includes('verify')) &&
          !href.includes('google.com') && !href.includes('microsoft.com')) {
        score -= 10;
        issues.push(`🔗 Suspicious link text`);
      }

      // Shortened URLs
      if (href.includes('bit.ly') || href.includes('tinyurl') || href.includes('t.co')) {
        score -= 8;
        issues.push(`⚡ Shortened URL detected`);
      }
    }
  });

  // Grammar/spelling indicators
  const poorGrammar = ['kindly', 'do the needful', 'dear esteemed'];
  poorGrammar.forEach(phrase => {
    if (body.includes(phrase)) {
      score -= 5;
      issues.push(`📝 Unusual phrasing`);
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
    position: fixed;
    top: 80px;
    right: 20px;
    width: 380px;
    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
    border: 3px solid ${color};
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 15px;
    color: #212121;
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

  // Add learning section if risk is medium/high
  if (score < 70) {
    addLearningSection(score, issues);
  }

  document.getElementById('aph-dismiss').onclick = () => overlay.remove();
  document.getElementById('aph-report').onclick = () => {
    alert('📧 Reported! Thanks for helping.');
  };
}

/**
 * Add learning section for medium/high risk emails
 */
function addLearningSection(score, issues) {
  // Check if extension context is valid
  if (!chrome.runtime || !chrome.runtime.id) {
    log('⚠️ Extension context invalidated - learning section not added');
    return;
  }
  
  // Check if learning mode is enabled via chrome.storage
  if (!chrome.storage || !chrome.storage.local) return;
  
  chrome.storage.local.get(['learningMode'], function(result) {
    if (chrome.runtime.lastError || !result.learningMode) return;
    
    const overlay = document.getElementById('anti-phish-overlay');
    if (!overlay) return;
    
    // Create learning section
    const learningDiv = document.createElement('div');
    learningDiv.id = 'anti-phish-learning';
    learningDiv.style.cssText = `
      margin-top: 15px;
      padding: 15px;
      background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%);
      border-radius: 10px;
      border: 2px solid #ffc107;
    `;
    
    const isHighRisk = score < 30;
    
    let learningContent = '';
    if (isHighRisk) {
      learningContent = `
        <div style="font-size: 16px; font-weight: bold; color: #d32f2f; margin-bottom: 10px;">
          🚨 HIGH RISK - Learn Why
        </div>
        <div style="font-size: 13px; color: #333; line-height: 1.6;">
          This email shows <strong>multiple red flags</strong> commonly used in phishing attacks:
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Creating false urgency to pressure quick action</li>
            <li>Impersonating trusted brands to gain trust</li>
            <li>Using deceptive links to steal credentials</li>
          </ul>
          <div style="background: #ffebee; padding: 10px; border-radius: 6px; margin-top: 10px;">
            <strong>💡 What to do:</strong> Delete this email. If concerned, contact the company directly through their official website (not via this email).
          </div>
        </div>
      `;
    } else {
      learningContent = `
        <div style="font-size: 16px; font-weight: bold; color: #f57c00; margin-bottom: 10px;">
          ⚠️ MEDIUM RISK - Be Careful
        </div>
        <div style="font-size: 13px; color: #333; line-height: 1.6;">
          This email has some suspicious elements worth noting:
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Check sender address carefully</li>
            <li>Hover over links before clicking</li>
            <li>Look for unusual requests or language</li>
          </ul>
          <div style="background: #fff3e0; padding: 10px; border-radius: 6px; margin-top: 10px;">
            <strong>💡 What to do:</strong> Proceed with caution. Verify through official channels if this requests any action.
          </div>
        </div>
      `;
    }
    
    learningDiv.innerHTML = learningContent;
    overlay.appendChild(learningDiv);
    
    log('📚 Learning section added');
  });
}

function removeExistingOverlay() {
  const existing = document.getElementById('anti-phish-overlay');
  if (existing) existing.remove();
}

function updateStats(score) {
  try {
    // Check if extension context is still valid
    if (!chrome.runtime || !chrome.runtime.id) {
      log('⚠️ Extension context invalidated - stats not saved');
      return;
    }

    // Use chrome.storage to sync with popup
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['scanned', 'blocked'], function(result) {
        // Check for runtime errors
        if (chrome.runtime.lastError) {
          log('⚠️ Storage read error:', chrome.runtime.lastError.message);
          return;
        }

        let scanned = (result.scanned || 0) + 1;
        let blocked = (result.blocked || 0) + (score < 30 ? 1 : 0);

        chrome.storage.local.set({ scanned, blocked }, function() {
          if (chrome.runtime.lastError) {
            log('⚠️ Storage write error:', chrome.runtime.lastError.message);
            return;
          }
          log('📊 Stats:', scanned, 'scanned,', blocked, 'blocked');
        });
      });
    }
  } catch (e) {
    log('⚠️ Stats error:', e.message);
  }
}

if (window.location.hostname.includes('mail.google.com')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
