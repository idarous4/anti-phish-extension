/**
 * ============================================================================
 * CONTENT SCRIPT FOR GMAIL
 * ============================================================================
 * 
 * WHAT IS THIS FILE?
 * This script runs INSIDE Gmail's webpage. It can:
 * - Read email content
 * - Modify the Gmail interface (add buttons, overlays)
 * - Detect when user opens an email
 * - Run AI analysis on the email
 * 
 * HOW IT WORKS:
 * 1. Gmail loads in browser
 * 2. Chrome injects this script into the page
 * 3. Script waits for user to open an email
 * 4. When email opens, script extracts content
 * 5. Script runs AI detection
 * 6. Script shows trust score overlay on the email
 * 
 * PRIVACY NOTE:
 * - All analysis happens locally in browser
 * - Email content NEVER leaves your computer
 * - No data sent to external servers
 * ============================================================================
 */

// ==========================================================================
// CONFIGURATION - ADJUST THESE SETTINGS
// ==========================================================================
const CONFIG = {
  // Minimum trust score to show warning (0-100)
  // 70 = Conservative (more warnings)
  // 50 = Balanced
  // 30 = Lenient (fewer warnings)
  RISK_THRESHOLD: 50,
  
  // How often to check for new emails (milliseconds)
  // 1000 = check every 1 second
  CHECK_INTERVAL: 1000,
  
  // Debug mode - shows console logs
  DEBUG: true
};

// ==========================================================================
// GLOBAL VARIABLES
// ==========================================================================
let currentEmailId = null;  // Track which email is currently open
let isAnalyzing = false;    // Prevent duplicate analysis

// ==========================================================================
// STEP 1: INITIALIZE WHEN GMAIL LOADS
// ==========================================================================

/**
 * Main initialization function
 * Runs when content script is injected into Gmail
 */
function init() {
  log('🛡️ Anti-Phish Shield loaded on Gmail');
  
  // Start watching for email opens
  watchForEmailOpens();
  
  // Also check immediately (in case email is already open)
  checkForOpenEmail();
}

/**
 * Helper function for logging
 * Only logs if DEBUG is true
 */
function log(...args) {
  if (CONFIG.DEBUG) {
    console.log('[Anti-Phish]', ...args);
  }
}

// ==========================================================================
// STEP 2: WATCH FOR EMAIL OPENS
// ==========================================================================

/**
 * Gmail is a "Single Page Application" (SPA)
 * It doesn't reload the page when you open an email
 * Instead, it changes the URL and updates the DOM
 * 
 * We use a MutationObserver to detect these changes
 */
function watchForEmailOpens() {
  log('👀 Watching for email opens...');
  
  // MutationObserver watches for changes in the page
  const observer = new MutationObserver((mutations) => {
    // Check if a new email was opened
    checkForOpenEmail();
  });
  
  // Start observing the entire Gmail page for changes
  observer.observe(document.body, {
    childList: true,      // Watch for added/removed elements
    subtree: true,        // Watch all descendants
    attributes: true      // Watch for attribute changes
  });
  
  // Also check periodically (backup method)
  setInterval(checkForOpenEmail, CONFIG.CHECK_INTERVAL);
}

// ==========================================================================
// STEP 3: DETECT IF EMAIL IS OPEN
// ==========================================================================

/**
 * Check if user currently has an email open
 * Gmail changes the URL when you open an email
 * URL pattern: https://mail.google.com/mail/u/0/#inbox/MESSAGE_ID
 */
function checkForOpenEmail() {
  // Get current URL
  const url = window.location.href;
  
  // Check if we're viewing an email (not inbox, not settings, etc.)
  // Gmail email URLs contain '/#inbox/' or '/#sent/' followed by a message ID
  const emailMatch = url.match(/#(inbox|sent|spam|trash)\/([a-zA-Z0-9]+)/);
  
  if (emailMatch) {
    const emailId = emailMatch[2];
    
    // Only analyze if this is a NEW email (not the one we already analyzed)
    if (emailId !== currentEmailId && !isAnalyzing) {
      currentEmailId = emailId;
      log('📧 New email detected:', emailId);
      
      // Wait a moment for Gmail to fully render the email
      setTimeout(() => {
        analyzeCurrentEmail();
      }, 500);
    }
  }
}

// ==========================================================================
// STEP 4: EXTRACT EMAIL DATA
// ==========================================================================

/**
 * Extract all relevant data from the currently open email
 * This includes: subject, sender, body text, links, attachments
 */
function analyzeCurrentEmail() {
  if (isAnalyzing) return;
  isAnalyzing = true;
  
  log('🔍 Analyzing email...');
  
  try {
    // Extract email data using Gmail's DOM structure
    const emailData = extractEmailData();
    
    if (!emailData) {
      log('❌ Could not extract email data');
      isAnalyzing = false;
      return;
    }
    
    log('📊 Email extracted:', {
      subject: emailData.subject,
      sender: emailData.sender,
      bodyLength: emailData.body.length,
      linkCount: emailData.links.length
    });
    
    // Run heuristics (fast, no AI)
    const heuristicResult = runHeuristics(emailData);
    log('🎯 Heuristic score:', heuristicResult.score);
    
    // TODO: Run TensorFlow.js AI model here
    // const aiScore = await runAIModel(emailData);
    
    // Combine scores (for now, just use heuristics)
    const finalScore = heuristicResult.score;
    
    // Show the trust overlay
    showTrustOverlay(finalScore, heuristicResult.issues, emailData);
    
  } catch (error) {
    log('❌ Error analyzing email:', error);
  } finally {
    isAnalyzing = false;
  }
}

/**
 * Extract email data from Gmail's DOM
 * 
 * GMAIL DOM SELECTORS (these might change if Google updates Gmail):
 * - Email container: [data-thread-perm-id] or [data-legacy-thread-id]
 * - Subject: h2[data-legacy-thread-id]
 * - Sender: [email] attribute on span
 * - Body: .a3s.aiL (the actual email content)
 */
function extractEmailData() {
  // Find the email container
  // Gmail uses different selectors depending on view (split pane, new window, etc.)
  const emailContainer = 
    document.querySelector('[data-thread-perm-id]') ||
    document.querySelector('[data-legacy-thread-id]') ||
    document.querySelector('[data-message-id]');
  
  if (!emailContainer) {
    return null;
  }
  
  // Extract subject
  // Gmail puts the subject in an h2 element
  const subjectElement = document.querySelector('h2[data-legacy-thread-id]');
  const subject = subjectElement ? subjectElement.innerText.trim() : 'No Subject';
  
  // Extract sender
  // Gmail puts sender email in [email] attribute
  const senderElement = document.querySelector('[email]');
  const sender = senderElement ? senderElement.getAttribute('email') : 'Unknown';
  const senderName = senderElement ? senderElement.innerText.trim() : 'Unknown';
  
  // Extract body
  // The email body has class 'a3s aiL' in Gmail
  const bodyElement = emailContainer.querySelector('.a3s.aiL') ||
                     document.querySelector('.a3s.aiL');
  const body = bodyElement ? bodyElement.innerText.trim() : '';
  const bodyHTML = bodyElement ? bodyElement.innerHTML : '';
  
  // Extract all links
  const links = [];
  if (bodyElement) {
    const linkElements = bodyElement.querySelectorAll('a');
    linkElements.forEach(a => {
      links.push({
        text: a.innerText.trim(),
        href: a.getAttribute('href'),
        displayUrl: a.innerText.trim()
      });
    });
  }
  
  return {
    subject,
    sender,
    senderName,
    body,
    bodyHTML,
    links,
    timestamp: new Date().toISOString()
  };
}

// ==========================================================================
// STEP 5: HEURISTIC RULES (FAST DETECTION)
// ==========================================================================

/**
 * Run rule-based detection (no AI needed)
 * These are fast checks that catch obvious phishing
 */
function runHeuristics(emailData) {
  let score = 100; // Start at 100 (safe), subtract for risks
  const issues = [];
  
  // RULE 1: Urgency language (common in phishing)
  const urgencyWords = [
    'urgent', 'immediately', 'act now', 'limited time',
    'expires', 'account will be suspended', 'verify now',
    'confirm immediately', 'security alert', 'unusual activity'
  ];
  
  const lowerBody = emailData.body.toLowerCase();
  const lowerSubject = emailData.subject.toLowerCase();
  
  urgencyWords.forEach(word => {
    if (lowerBody.includes(word) || lowerSubject.includes(word)) {
      score -= 10;
      issues.push(`Urgency language detected: "${word}"`);
    }
  });
  
  // RULE 2: Sender display name vs actual email mismatch
  // Example: Display name is "PayPal" but email is "paypal-security@gmail.com"
  const commonSpoofs = ['paypal', 'apple', 'amazon', 'microsoft', 'google', 'facebook', 'bank'];
  commonSpoofs.forEach(brand => {
    if (emailData.senderName.toLowerCase().includes(brand) && 
        !emailData.sender.toLowerCase().includes(brand + '.com')) {
      score -= 25;
      issues.push(`Possible spoof: Claims to be ${brand} but sender is ${emailData.sender}`);
    }
  });
  
  // RULE 3: Suspicious links (display text ≠ actual URL)
  emailData.links.forEach(link => {
    if (link.text && link.href) {
      // Check if link shows one domain but goes to another
      const textDomain = extractDomain(link.text);
      const hrefDomain = extractDomain(link.href);
      
      if (textDomain && hrefDomain && textDomain !== hrefDomain) {
        score -= 20;
        issues.push(`Link disguised: Shows "${link.text}" but goes to "${hrefDomain}"`);
      }
    }
  });
  
  // RULE 4: Poor grammar/spelling (many phishing emails have errors)
  const grammarIndicators = [
    'dear customer', 'dear user', 'valued customer',
    'kindly', 'do the needful', 'proceed immediately'
  ];
  
  grammarIndicators.forEach(phrase => {
    if (lowerBody.includes(phrase)) {
      score -= 5;
      issues.push(`Suspicious phrasing: "${phrase}"`);
    }
  });
  
  // RULE 5: Requests for sensitive info
  const sensitiveRequests = [
    'password', 'credit card', 'ssn', 'social security',
    'verify your account', 'confirm your identity'
  ];
  
  sensitiveRequests.forEach(request => {
    if (lowerBody.includes(request)) {
      score -= 15;
      issues.push(`Requests sensitive info: "${request}"`);
    }
  });
  
  // Ensure score doesn't go below 0
  score = Math.max(0, score);
  
  return {
    score,
    issues,
    riskLevel: score < 30 ? 'HIGH' : score < 70 ? 'MEDIUM' : 'LOW'
  };
}

/**
 * Helper: Extract domain from URL
 * Example: "https://www.paypal.com/login" → "paypal.com"
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (e) {
    return null;
  }
}

// ==========================================================================
// STEP 6: SHOW TRUST OVERLAY (UI)
// ==========================================================================

/**
 * Display the trust score and warnings on top of the email
 */
function showTrustOverlay(score, issues, emailData) {
  // Remove any existing overlay first
  removeExistingOverlay();
  
  // Determine colors based on score
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
  
  // Create overlay element
  const overlay = document.createElement('div');
  overlay.id = 'anti-phish-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    width: 360px;
    max-height: 500px;
    overflow-y: auto;
    background: #ffffff;
    border: 4px solid ${color};
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.25);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
    font-size: 16px;
    line-height: 1.6;
    color: #333333;
  `;
  
  // Build overlay content
  let issuesHtml = '';
  if (issues.length > 0) {
    issuesHtml = `
      <div style="margin-top: 15px; padding: 15px; background: #fff8e1; border-radius: 10px; border-left: 4px solid #ff9800;">
        <strong style="color: #e65100; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 10px;">⚠️ Issues Found:</strong>
        <ul style="margin: 0; padding-left: 20px; color: #333; font-size: 15px; line-height: 1.8;">
          ${issues.map(issue => `<li style="margin-bottom: 6px; font-weight: 500;">${issue}</li>`).join('')}
        </ul>
      </div>
    `;
  }
  
  overlay.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 12px;">
      <span style="font-size: 32px; margin-right: 12px;">${icon}</span>
      <div>
        <div style="font-size: 28px; font-weight: 700; color: ${color}; letter-spacing: -0.5px;">
          ${score}/100
        </div>
        <div style="font-size: 14px; color: #666; font-weight: 500;">Trust Score</div>
      </div>
    </div>
    <div style="color: ${color}; font-weight: 700; margin-bottom: 10px; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px;">
      ${title}
    </div>
    <div style="font-size: 15px; color: #555; margin-bottom: 15px; font-weight: 500;">
      📧 From: ${emailData.sender}
    </div>
    ${issuesHtml}
    <div style="margin-top: 15px; display: flex; gap: 10px;">
      <button id="anti-phish-dismiss" 
              style="flex: 1; padding: 12px; border: 2px solid #ddd; border-radius: 8px; background: #f8f9fa; cursor: pointer; font-size: 15px; font-weight: 600; color: #444; transition: all 0.2s;">
        ✕ Dismiss
      </button>
      <button id="anti-phish-report"
              style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: ${color}; color: white; cursor: pointer; font-size: 15px; font-weight: 600; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
        🚩 Report
      </button>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(overlay);
  
  // Add event listeners (inline onclick doesn't work in content scripts due to CSP)
  const dismissBtn = document.getElementById('anti-phish-dismiss');
  const reportBtn = document.getElementById('anti-phish-report');
  
  dismissBtn.addEventListener('click', function() {
    removeExistingOverlay();
  });
  
  dismissBtn.addEventListener('mouseenter', function() {
    this.style.background = '#e9ecef';
  });
  
  dismissBtn.addEventListener('mouseleave', function() {
    this.style.background = '#f8f9fa';
  });
  
  reportBtn.addEventListener('click', function() {
    alert('📧 Reported!\n\nThank you for helping improve detection.\n\nThis email will be used to train our AI model.');
  });
  
  reportBtn.addEventListener('mouseenter', function() {
    this.style.opacity = '0.9';
  });
  
  reportBtn.addEventListener('mouseleave', function() {
    this.style.opacity = '1';
  });
  
  log('✅ Trust overlay displayed');
}

/**
 * Remove any existing overlay (prevents duplicates)
 */
function removeExistingOverlay() {
  const existing = document.getElementById('anti-phish-overlay');
  if (existing) {
    existing.remove();
  }
}

// ==========================================================================
// STEP 7: RUN ON PAGE LOAD
// ==========================================================================

// Check if we're actually on Gmail before running
if (window.location.hostname.includes('mail.google.com')) {
  // Wait for Gmail to fully load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
} else {
  console.log('[Anti-Phish] Not on Gmail, skipping...');
}

/**
 * ============================================================================
 * TODO: ADD THESE FEATURES IN PHASE 2
 * ============================================================================
 * 
 * 1. TensorFlow.js Integration
 *    - Load the trained model
 *    - Run AI prediction on email content
 *    - Combine with heuristic score
 * 
 * 2. Settings Integration
 *    - Read user's sensitivity preference from storage
 *    - Allow disabling for specific senders
 * 
 * 3. Reporting System
 *    - Send false positive/negative reports
 *    - Update local threat database
 * 
 * 4. Performance Optimization
 *    - Cache analysis results
 *    - Debounce rapid email switches
 *    - Lazy load TensorFlow model
 * 
 * 5. Better Gmail Integration
 *    - Add indicators to email list (inbox view)
 *    - Color-code email rows by risk
 *    - Add "Scan" button to toolbar
 * ============================================================================
 */
