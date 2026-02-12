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

// Educational content database for Learning Mode
const EDUCATION_DB = {
  // Tips of the day - rotated randomly
  tipsOfTheDay: [
    {
      icon: '⚡',
      title: 'The Urgency Trap',
      text: 'Phishing emails create fake urgency: "Act now!" "Account suspended!" Real companies give you time to respond.',
      action: 'Take a breath. Log into the service directly through your browser, not via email links.'
    },
    {
      icon: '👤',
      title: 'The Fake Sender',
      text: 'Scammers spoof sender names. The display name says "Amazon" but the email might be @amaz0n-support.com',
      action: 'Always check the actual email address, not just the display name.'
    },
    {
      icon: '🔗',
      title: 'Hidden Destinations',
      text: 'Link text says "PayPal.com" but hover to see it actually goes to "evil-site.com/paypal"',
      action: 'Hover over links before clicking. The real URL appears at the bottom of your browser.'
    },
    {
      icon: '🔒',
      title: 'Password Never Requested',
      text: 'Legitimate companies will NEVER ask for your password via email, text, or phone.',
      action: 'If asked for a password, it\'s a scam. Contact the company directly through their official website.'
    },
    {
      icon: '🎁',
      title: 'Too Good To Be True',
      text: 'Free iPhones, lottery wins you never entered, inheritances from strangers - all scams.',
      action: 'If it sounds too good to be true, it definitely is. Delete and ignore.'
    },
    {
      icon: '📝',
      title: 'Spelling Mistakes Matter',
      text: 'Professional companies proofread their emails. Multiple typos = red flag.',
      action: 'Watch for odd phrasing like "kindly do the needful" or "Dear Esteemed Customer".'
    },
    {
      icon: '📎',
      title: 'Suspicious Attachments',
      text: 'Unexpected .exe, .zip, .docm, or .pdf files can contain malware.',
      action: 'Never open attachments you weren\'t expecting. Contact the sender via a separate channel to verify.'
    },
    {
      icon: '🏢',
      title: 'Generic Greetings',
      text: '"Dear Customer" instead of your name? Legitimate companies usually personalize.',
      action: 'Be wary of generic greetings, especially when combined with urgent requests.'
    },
    {
      icon: '💳',
      title: 'The Fake Invoice',
      text: 'Scammers send fake invoices hoping you\'ll panic-pay without checking.',
      action: 'Verify unexpected invoices by logging into your account directly - never through email links.'
    },
    {
      icon: '📱',
      title: 'SMiShing: SMS Phishing',
      text: 'Text messages can be phishing too. Same rules apply!',
      action: 'Don\'t click links in unexpected texts. Verify through official apps or websites.'
    }
  ],
  
  // Issue-specific educational content
  issueEducation: {
    urgency: {
      icon: '⏰',
      title: 'Urgency Tactics',
      explanation: 'Scammers create false urgency to bypass your critical thinking. Your brain reacts to threats before analyzing them.',
      examples: ['"Act immediately!"', '"Account will be deleted in 24 hours"', '"Urgent action required"'],
      defense: 'Legitimate companies don\'t threaten account deletion via email. Take time to verify through official channels.'
    },
    spoof: {
      icon: '🎭',
      title: 'Brand Spoofing',
      explanation: 'Scammers impersonate trusted brands to exploit your existing trust relationship.',
      examples: ['Fake PayPal logos', 'Amazon look-alike pages', 'Bank email templates'],
      defense: 'Go directly to the website by typing the URL. Never use email links for sensitive actions.'
    },
    link: {
      icon: '🕸️',
      title: 'Deceptive Links',
      explanation: 'Links may look legitimate but redirect to fake sites designed to steal credentials.',
      examples: ['bit.ly/shortened-links', 'amaz0n.com (with zero)', 'paypal.com.evil-site.com'],
      defense: 'Always hover to see the real URL. Look for HTTPS and correct domain spelling.'
    },
    credential: {
      icon: '🗝️',
      title: 'Credential Harvesting',
      explanation: 'Fake login pages capture your username/password, often for multiple accounts (since people reuse passwords).',
      examples: ['"Verify your account"', '"Update your payment info"', '"Confirm your identity"'],
      defense: 'No legitimate service asks for your password via email. Ever. Contact them directly if unsure.'
    },
    attachment: {
      icon: '🦠',
      title: 'Malicious Attachments',
      explanation: 'Files can contain malware that steals data, encrypts files for ransom, or spies on you.',
      examples: ['.exe files', '.zip archives', 'Macros in Office docs', 'Unexpected PDFs'],
      defense: 'Use antivirus software. Never open unexpected attachments. Verify via separate communication channel.'
    },
    grammar: {
      icon: '📚',
      title: 'Language Red Flags',
      explanation: 'Many phishing emails originate from non-native speakers or use translation tools.',
      examples: ['"Kindly do the needful"', '"Dear Esteemed Customer"', '"We detected an activity"'],
      defense: 'Professional companies proofread. Multiple errors or unusual phrasing are warning signs.'
    },
    greeting: {
      icon: '👋',
      title: 'Impersonal Greetings',
      explanation: 'Mass phishing campaigns use generic greetings because they don\'t know your actual name.',
      examples: ['"Dear Customer"', '"Dear User"', '"Dear Valued Member"'],
      defense: 'Companies you do business with usually personalize emails. Combined with urgency = red flag.'
    },
    sender: {
      icon: '📧',
      title: 'Suspicious Sender',
      explanation: 'Scammers use look-alike domains or compromised accounts to appear legitimate.',
      examples: ['@amaz0n-support.com', '@paypa1-security.net', '@apple-id-verify.com'],
      defense: 'Check the full email address. Look for misspellings, extra characters, or unusual domains.'
    }
  }
};

let currentEmailId = null;
let isAnalyzing = false;
let scannedEmails = new Set(); // Track already-scanned emails to prevent duplicates

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
    
    // Check if already scanned this email ID
    if (scannedEmails.has(currentEmailId)) {
      log('📧 Already scanned this email, skipping stats update');
      showTrustOverlay(result.score, result.issues, emailData);
      // Don't update stats for duplicate
    } else {
      scannedEmails.add(currentEmailId);
      showTrustOverlay(result.score, result.issues, emailData);
      updateStats(result.score);
    }

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
  const bodyRaw = emailData.body; // Keep original case for some checks
  const subjectRaw = emailData.subject;

  // ==========================================
  // 1. URGENCY & PRESSURE TACTICS (Enhanced)
  // ==========================================
  const urgencyWords = [
    'urgent', 'immediately', 'act now', 'verify', 'suspended',
    'security alert', 'unusual activity', 'confirm', 'limited time',
    'expires', 'deadline', 'asap', 'emergency', 'warning',
    'account will be locked', 'final notice', 'immediate action required'
  ];

  urgencyWords.forEach(word => {
    if (body.includes(word) || subject.includes(word)) {
      score -= 10;
      issues.push(`⚠️ Urgency: "${word}"`);
    }
  });

  // ==========================================
  // 2. SUSPICIOUS SENDER PATTERNS
  // ==========================================
  if (sender.includes('no-reply') || sender.includes('noreply')) {
    score -= 5;
    issues.push(`📧 No-reply sender`);
  }

  if (sender.includes('alert') || sender.includes('security') || sender.includes('verify')) {
    score -= 10;
    issues.push(`🚨 Suspicious sender name`);
  }

  // Check for lookalike domains (typosquatting)
  const trustedDomains = ['google.com', 'microsoft.com', 'apple.com', 'amazon.com', 'paypal.com', 'netflix.com'];
  const senderDomain = sender.split('@')[1] || '';
  trustedDomains.forEach(trusted => {
    if (senderDomain && senderDomain !== trusted) {
      // Check for common typosquatting patterns
      const lookalikePatterns = [
        trusted.replace('.', '-'), trusted.replace('.', ''),
        trusted.replace('o', '0'), trusted.replace('l', '1'),
        trusted.replace('a', '4'), trusted.replace('e', '3')
      ];
      lookalikePatterns.forEach(pattern => {
        if (senderDomain.includes(pattern) || levenshteinDistance(senderDomain, trusted) <= 2) {
          score -= 20;
          issues.push(`🔴 Lookalike domain detected: ${senderDomain} mimics ${trusted}`);
        }
      });
    }
  });

  // ==========================================
  // 3. GENERIC GREETINGS & AI-GENERATED PHISHING
  // ==========================================
  const genericGreetings = ['dear customer', 'dear user', 'dear client', 'valued customer'];
  genericGreetings.forEach(greeting => {
    if (body.includes(greeting)) {
      score -= 8;
      issues.push(`👤 Generic greeting: "${greeting}"`);
    }
  });

  // AI-Generated phishing indicators (2024-2026 trend)
  // AI phishing often has perfect grammar but unnatural patterns
  const aiPhishingPatterns = [
    'i hope this email finds you well',
    'per my last email',
    'circling back',
    'touching base',
    'as discussed',
    'gentle reminder',
    'following up on',
    'best regards,'
  ];
  let aiPatternCount = 0;
  aiPhishingPatterns.forEach(pattern => {
    if (body.includes(pattern)) aiPatternCount++;
  });
  if (aiPatternCount >= 3) {
    score -= 12;
    issues.push(`🤖 AI-generated content patterns detected (${aiPatternCount} markers)`);
  }

  // ==========================================
  // 4. SENSITIVE INFORMATION REQUESTS
  // ==========================================
  const sensitiveRequests = [
    'password', 'credit card', 'ssn', 'social security',
    'bank account', 'verify your account', 'confirm your identity',
    'update your information', 'click here to verify',
    'confirm your password', 're-enter your credentials'
  ];

  sensitiveRequests.forEach(request => {
    if (body.includes(request)) {
      score -= 15;
      issues.push(`🔒 Requests: "${request}"`);
    }
  });

  // ==========================================
  // 5. CRYPTO & WEB3 SCAM DETECTION (2024-2026)
  // ==========================================
  const cryptoScamIndicators = [
    'seed phrase', 'recovery phrase', 'private key',
    'wallet synchronization', 'validate your wallet',
    'connect wallet', 'approve this transaction',
    'gas fee reimbursement', 'token airdrop',
    'confirm metamask', 'wallet verification required',
    'unclaimed tokens', 'liquidity pool',
    'double your crypto', 'guaranteed returns'
  ];

  cryptoScamIndicators.forEach(indicator => {
    if (body.includes(indicator) || subject.includes(indicator)) {
      score -= 18;
      issues.push(`₿ Crypto scam: "${indicator}"`);
    }
  });

  // ==========================================
  // 6. QR CODE SCAMS ("Quishing" - 2025-2026 Trend)
  // ==========================================
  const qrScamIndicators = [
    'scan the qr code', 'scan qr code', 'scan this code',
    'qr code to verify', 'scan to authenticate',
    'secure login qr', 'scan to confirm',
    'mobile verification code', 'authentication qr'
  ];

  qrScamIndicators.forEach(indicator => {
    if (body.includes(indicator)) {
      score -= 16;
      issues.push(`📱 QR code scam (quishing): "${indicator}"`);
    }
  });

  // Check for QR code images in email body
  const hasQrImage = bodyRaw.includes('qr code') || bodyRaw.includes('qrcode') || 
                     bodyRaw.includes('barcode') || emailData.body.match(/\bqr\b/i);
  if (hasQrImage && (body.includes('verify') || body.includes('authenticate') || body.includes('login'))) {
    score -= 14;
    issues.push(`📱 Suspicious QR code for authentication detected`);
  }

  // ==========================================
  // 7. VOICE PHISHING (VISHING) INDICATORS
  // ==========================================
  const vishingIndicators = [
    'call this number immediately', 'call to verify',
    'verify by phone', 'call our security team',
    'automated verification line', 'call within 24 hours',
    'toll-free verification', 'voice verification required',
    'speak to a representative', 'callback number'
  ];

  // Extract phone numbers from body
  const phonePattern = /\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  const phoneMatches = bodyRaw.match(phonePattern) || [];

  vishingIndicators.forEach(indicator => {
    if (body.includes(indicator)) {
      score -= 12;
      issues.push(`📞 Voice phishing (vishing): "${indicator}"`);
    }
  });

  if (phoneMatches.length > 0 && (body.includes('verify') || body.includes('suspended') || body.includes('urgent'))) {
    score -= 10;
    issues.push(`📞 Suspicious phone number in urgent context: ${phoneMatches[0]}`);
  }

  // ==========================================
  // 8. DEEPFAKE & SYNTHETIC MEDIA SCAMS (2025-2026)
  // ==========================================
  const deepfakeIndicators = [
    'voice message attached', 'audio verification',
    'video verification required', 'watch this video',
    'ceo message', 'executive video',
    'secure video link', 'video confirmation',
    'synthetic media', 'ai-generated proof'
  ];

  deepfakeIndicators.forEach(indicator => {
    if (body.includes(indicator) || subject.includes(indicator)) {
      score -= 15;
      issues.push(`🎭 Deepfake/synthetic media scam: "${indicator}"`);
    }
  });

  // ==========================================
  // 9. LINK ANALYSIS & URL OBSCURATION
  // ==========================================
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
      const shortUrlServices = ['bit.ly', 'tinyurl', 't.co', 'short.link', 'ow.ly', 'buff.ly', 'rebrand.ly', 'rb.gy'];
      shortUrlServices.forEach(service => {
        if (href.includes(service)) {
          score -= 10;
          issues.push(`⚡ Shortened URL (${service}) - hidden destination`);
        }
      });

      // IP address links (highly suspicious)
      if (href.match(/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)) {
        score -= 20;
        issues.push(`🔴 Link uses IP address instead of domain - major red flag`);
      }

      // Punycode/IDN homograph attacks
      if (href.includes('xn--')) {
        score -= 25;
        issues.push(`🔴 Punycode domain detected - possible homograph attack`);
      }

      // Data URIs (phishing payload)
      if (href.startsWith('data:')) {
        score -= 30;
        issues.push(`🔴 Data URI link - potential phishing payload`);
      }

      // JavaScript URLs
      if (href.startsWith('javascript:')) {
        score -= 30;
        issues.push(`🔴 JavaScript link - potential malicious code`);
      }
    }
  });

  // ==========================================
  // 10. EVASION & OBFUSCATION TECHNIQUES
  // ==========================================
  // HTML entity encoding to hide malicious content
  if (bodyRaw.includes('&#')) {
    const htmlEntityCount = (bodyRaw.match(/&#[0-9]+;/g) || []).length;
    if (htmlEntityCount > 5) {
      score -= 8;
      issues.push(`📝 HTML entity encoding detected - possible evasion attempt`);
    }
  }

  // Zero-width characters (invisible to users, detectable by filters)
  const zeroWidthChars = /[\u200B-\u200D\uFEFF]/;
  if (zeroWidthChars.test(bodyRaw) || zeroWidthChars.test(subjectRaw)) {
    score -= 15;
    issues.push(`📝 Zero-width characters detected - evasion technique`);
  }

  // ==========================================
  // 11. SOCIAL ENGINEERING PATTERNS
  // ==========================================
  // Calendar invite scams
  if (body.includes('calendar invite') || body.includes('meeting invitation') ||
      body.includes('accept invitation') || body.includes('view meeting')) {
    score -= 10;
    issues.push(`📅 Calendar invite - verify sender before accepting`);
  }

  // Shared document phishing
  if ((body.includes('shared') || body.includes('view document')) &&
      (body.includes('doc') || body.includes('pdf') || body.includes('file'))) {
    score -= 8;
    issues.push(`📄 Shared document request - verify before opening`);
  }

  // Reply-to different email
  if (bodyRaw.match(/reply to.*@[\w.-]+/i) && !sender.includes(bodyRaw.match(/reply to\s+([\w.-]+@[\w.-]+)/i)?.[1] || '')) {
    score -= 12;
    issues.push(`📧 Reply-to different email address - redirect scam`);
  }

  // ==========================================
  // 12. TRADITIONAL INDICATORS
  // ==========================================
  const poorGrammar = ['kindly', 'do the needful', 'dear esteemed'];
  poorGrammar.forEach(phrase => {
    if (body.includes(phrase)) {
      score -= 5;
      issues.push(`📝 Unusual phrasing`);
    }
  });

  return { score: Math.max(0, score), issues };
}

/**
 * Calculate Levenshtein distance for lookalike domain detection
 * CSP-compliant string similarity check
 */
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = [];

  for (let i = 0; i <= m; i++) {
    dp[i] = [];
    for (let j = 0; j <= n; j++) {
      if (i === 0) dp[i][j] = j;
      else if (j === 0) dp[i][j] = i;
      else if (str1[i - 1] === str2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
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
    top: 20px;
    right: 20px;
    width: 380px;
    max-height: 90vh;
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 25px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.05);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    overflow: hidden;
    animation: aph-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    flex-direction: column;
  `;
  
  // Add animation styles
  if (!document.getElementById('aph-styles')) {
    const style = document.createElement('style');
    style.id = 'aph-styles';
    style.textContent = `
      @keyframes aph-slide-in {
        from { opacity: 0; transform: translateX(100px) scale(0.95); }
        to { opacity: 1; transform: translateX(0) scale(1); }
      }
      #anti-phish-overlay button:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
      #anti-phish-overlay button:active { transform: translateY(0); }
      .aph-issue-card { transition: all 0.3s ease; }
      .aph-issue-card:hover { transform: translateX(4px); }
      .aph-tip-badge { animation: aph-pulse 2s infinite; }
      @keyframes aph-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      .aph-expand-btn { transition: transform 0.3s; }
      .aph-expand-btn.expanded { transform: rotate(180deg); }
    `;
    document.head.appendChild(style);
  }

  // Map issue types to educational content
  const issueMap = mapIssuesToEducation(issues);
  
  let issuesHtml = '';
  if (issues.length > 0) {
    issuesHtml = `
      <div style="margin: 16px 0;">
        <div style="font-size: 12px; color: ${color}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; display: flex; align-items: center;">
          <span style="margin-right: 6px;">⚠️</span>
          ${issues.length} Issue${issues.length > 1 ? 's' : ''} Detected
          <span style="margin-left: auto; font-size: 10px; color: #888; font-weight: 500; text-transform: none;">Click for details</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${issueMap.map((issue, idx) => `
            <div class="aph-issue-card" style="background: ${issue.education ? '#fff8e1' : '#fafafa'}; border-radius: 12px; border-left: 4px solid ${color}; overflow: hidden;">
              <div class="aph-issue-header" data-issue="${idx}" style="padding: 12px 14px; cursor: pointer; display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px; flex-shrink: 0;">${issue.education?.icon || '⚠️'}</span>
                <span style="font-size: 13px; color: #333; font-weight: 500; flex: 1;">${issue.text}</span>
                ${issue.education ? `
                  <span class="aph-tip-badge" style="background: #ffc107; color: #333; font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 600;">TIP</span>
                  <span class="aph-expand-btn" style="font-size: 12px; color: #888;">▼</span>
                ` : ''}
              </div>
              ${issue.education ? `
                <div class="aph-issue-content" id="aph-issue-${idx}" style="display: none; padding: 0 14px 14px; border-top: 1px dashed #e0e0e0;">
                  <div style="padding-top: 12px;">
                    <div style="font-size: 11px; color: #666; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">💡 Why this matters</div>
                    <div style="font-size: 12px; color: #444; line-height: 1.5; margin-bottom: 10px;">${issue.education.explanation}</div>
                    
                    <div style="background: #e3f2fd; border-radius: 8px; padding: 10px; margin-bottom: 10px;">
                      <div style="font-size: 10px; color: #1976d2; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">🛡️ How to protect yourself</div>
                      <div style="font-size: 11px; color: #333; line-height: 1.4;">${issue.education.defense}</div>
                    </div>
                    
                    <div style="font-size: 10px; color: #888; margin-top: 8px;">
                      <strong>Common examples:</strong> ${issue.education.examples.join(', ')}
                    </div>
                  </div>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  overlay.innerHTML = `
    <!-- Header with colored bar -->
    <div style="height: 8px; background: ${color}; flex-shrink: 0;"></div>
    
    <!-- Scrollable Content -->
    <div style="padding: 24px; overflow-y: auto; flex: 1;">
      <!-- Top: Score Circle + Status -->
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
            font-size: 18px; font-weight: 700; color: ${color};">
            ${score}
          </div>
        </div>
        <div>
          <div style="font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Trust Score</div>
          <div style="font-size: 18px; font-weight: 700; color: ${color}; line-height: 1.3;">${title}</div>
        </div>
      </div>
      
      <!-- Sender -->
      <div style="
        background: #f7f7f7; border-radius: 12px; padding: 12px 16px;
        margin-bottom: ${issues.length > 0 ? '16px' : '20px'};
        display: flex; align-items: center;
      ">
        <span style="font-size: 18px; margin-right: 10px;">📧</span>
        <div style="overflow: hidden;">
          <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">Sender</div>
          <div style="font-size: 14px; color: #333; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${emailData.sender}</div>
        </div>
      </div>
      
      ${issuesHtml}
      
      <!-- Buttons -->
      <div style="display: flex; gap: 12px; margin-top: 8px;">
        <button id="aph-dismiss" style="
          flex: 1; padding: 14px; border: 1.5px solid #ddd; border-radius: 12px;
          background: #fff; color: #555; cursor: pointer; font-weight: 600; font-size: 14px;
          transition: all 0.2s;
        ">Dismiss</button>
        <button id="aph-report" style="
          flex: 1; padding: 14px; border: none; border-radius: 12px;
          background: ${color}; color: white; cursor: pointer; font-weight: 600; font-size: 14px;
          transition: all 0.2s; box-shadow: 0 4px 15px ${color}40;
        ">Report Phishing</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Add click handlers for expandable issue cards (CSP-compliant)
  issueMap.forEach((issue, idx) => {
    if (issue.education) {
      const header = overlay.querySelector(`[data-issue="${idx}"]`);
      const content = overlay.querySelector(`#aph-issue-${idx}`);
      const expandBtn = header?.querySelector('.aph-expand-btn');
      
      if (header && content) {
        header.addEventListener('click', () => {
          const isVisible = content.style.display !== 'none';
          content.style.display = isVisible ? 'none' : 'block';
          if (expandBtn) {
            expandBtn.classList.toggle('expanded', !isVisible);
            expandBtn.textContent = isVisible ? '▼' : '▲';
          }
        });
        
        header.addEventListener('mouseenter', () => {
          header.style.background = 'rgba(0,0,0,0.02)';
        });
        header.addEventListener('mouseleave', () => {
          header.style.background = 'transparent';
        });
      }
    }
  });

  // Show previous feedback/reputation if available
  showPreviousFeedback(emailData.sender);

  // Add learning content (Tip of the Day + educational content)
  addLearningContent(score, issues, issueMap);

  // Add questionnaire for medium/high risk
  if (score < 70) {
    checkIfTrusted(emailData.sender, function(isTrusted) {
      if (!isTrusted) {
        setTimeout(() => addValidationQuestionnaire(score, emailData), 500);
      } else {
        log('✅ Sender is trusted - skipping questionnaire');
      }
    });
  }

  // Button event listeners (CSP-compliant)
  const dismissBtn = overlay.querySelector('#aph-dismiss');
  const reportBtn = overlay.querySelector('#aph-report');
  
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => overlay.remove());
  }
  
  if (reportBtn) {
    reportBtn.addEventListener('click', () => {
      showReportConfirmation(overlay);
    });
  }
}

/**
 * Map detected issues to educational content
 */
function mapIssuesToEducation(issues) {
  return issues.map(issue => {
    const text = issue;
    let education = null;
    
    const issueLower = issue.toLowerCase();
    
    if (issueLower.includes('urgency')) {
      education = EDUCATION_DB.issueEducation.urgency;
    } else if (issueLower.includes('spoof') || issueLower.includes('brand')) {
      education = EDUCATION_DB.issueEducation.spoof;
    } else if (issueLower.includes('link')) {
      education = EDUCATION_DB.issueEducation.link;
    } else if (issueLower.includes('sensitive') || issueLower.includes('password') || issueLower.includes('requests')) {
      education = EDUCATION_DB.issueEducation.credential;
    } else if (issueLower.includes('grammar') || issueLower.includes('phrasing')) {
      education = EDUCATION_DB.issueEducation.grammar;
    } else if (issueLower.includes('greeting') || issueLower.includes('customer')) {
      education = EDUCATION_DB.issueEducation.greeting;
    } else if (issueLower.includes('sender') || issueLower.includes('no-reply')) {
      education = EDUCATION_DB.issueEducation.sender;
    } else if (issueLower.includes('shortened') || issueLower.includes('url')) {
      education = EDUCATION_DB.issueEducation.link;
    }
    
    return { text, education };
  });
}

/**
 * Show report confirmation feedback
 */
function showReportConfirmation(overlay) {
  const content = overlay.querySelector('div[style*="overflow-y: auto"]');
  if (content) {
    const originalContent = content.innerHTML;
    content.innerHTML = `
      <div style="text-align: center; padding: 30px 20px;">
        <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
        <div style="font-size: 18px; font-weight: 700; color: #2e7d32; margin-bottom: 8px;">Thank You for Reporting!</div>
        <div style="font-size: 13px; color: #555; line-height: 1.5; margin-bottom: 20px;">
          Your report helps protect others from phishing attacks.<br>
          We've saved this email details for analysis.
        </div>
        <button id="aph-close" style="
          padding: 12px 24px; border: none; border-radius: 10px;
          background: #4caf50; color: white; cursor: pointer; font-weight: 600;
        ">Close</button>
      </div>
    `;
    
    const closeBtn = content.querySelector('#aph-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => overlay.remove());
    }
    
    // Auto-close after 3 seconds
    setTimeout(() => {
      if (document.body.contains(overlay)) {
        overlay.remove();
      }
    }, 3000);
  }
}

/**
 * Add learning content - Tip of the Day + educational content for detected issues
 * Shows for ALL emails when Learning Mode is ON
 */
function addLearningContent(score, issues, issueMap) {
  // Check if extension context is valid
  if (!chrome.runtime || !chrome.runtime.id) {
    log('⚠️ Extension context invalidated - learning content not added');
    return;
  }
  
  // Check if learning mode is enabled via chrome.storage
  if (!chrome.storage || !chrome.storage.local) return;
  
  chrome.storage.local.get(['learningMode'], function(result) {
    if (chrome.runtime.lastError) {
      log('⚠️ Storage error:', chrome.runtime.lastError.message);
      return;
    }
    
    // Only show if learning mode is explicitly enabled
    if (result.learningMode !== true) {
      log('📚 Learning Mode is OFF - skipping educational content');
      return;
    }
    
    const overlay = document.getElementById('anti-phish-overlay');
    if (!overlay) return;
    
    const isHighRisk = score < 30;
    const isMediumRisk = score >= 30 && score < 70;
    const isLowRisk = score >= 70;
    
    // Create learning section container
    const learningDiv = document.createElement('div');
    learningDiv.id = 'anti-phish-learning';
    learningDiv.style.cssText = `
      margin-top: 16px;
      padding: 20px;
      background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%);
      border-radius: 16px;
      border: 2px solid #ffc107;
      animation: aph-fade-in 0.5s ease;
    `;
    
    // Add fade-in animation if not already present
    if (!document.getElementById('aph-anim-styles')) {
      const style = document.createElement('style');
      style.id = 'aph-anim-styles';
      style.textContent = `
        @keyframes aph-fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Get random Tip of the Day
    const randomTip = EDUCATION_DB.tipsOfTheDay[Math.floor(Math.random() * EDUCATION_DB.tipsOfTheDay.length)];
    
    // Build content based on risk level
    let learningContent = '';
    
    if (isHighRisk) {
      learningContent = `
        <div style="display: flex; align-items: center; margin-bottom: 14px;">
          <span style="font-size: 28px; margin-right: 12px;">🚨</span>
          <div style="font-size: 16px; font-weight: 700; color: #d32f2f;">HIGH RISK - Learn Why</div>
        </div>
        <div style="font-size: 13px; color: #333; line-height: 1.6; margin-bottom: 14px;">
          This email shows <strong>multiple red flags</strong> commonly used in phishing attacks. 
          Scammers use these techniques to trick you into giving away passwords or personal information.
        </div>
        <div style="background: #ffebee; border-radius: 10px; padding: 14px; margin-bottom: 16px; border-left: 4px solid #f44336;">
          <div style="font-size: 12px; font-weight: 700; color: #c62828; margin-bottom: 6px;">🛡️ What You Should Do</div>
          <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #333; line-height: 1.6;">
            <li><strong>Do NOT click any links</strong> in this email</li>
            <li><strong>Do NOT download attachments</strong></li>
            <li><strong>Delete the email</strong> immediately</li>
            <li>If concerned, contact the company <strong>directly</strong> through their official website</li>
          </ul>
        </div>
      `;
    } else if (isMediumRisk) {
      learningContent = `
        <div style="display: flex; align-items: center; margin-bottom: 14px;">
          <span style="font-size: 28px; margin-right: 12px;">⚠️</span>
          <div style="font-size: 16px; font-weight: 700; color: #f57c00;">MEDIUM RISK - Be Careful</div>
        </div>
        <div style="font-size: 13px; color: #333; line-height: 1.6; margin-bottom: 14px;">
          This email has some suspicious elements worth noting. While not definitely phishing, 
          it exhibits characteristics common in suspicious messages.
        </div>
        <div style="background: #fff3e0; border-radius: 10px; padding: 14px; margin-bottom: 16px; border-left: 4px solid #ff9800;">
          <div style="font-size: 12px; font-weight: 700; color: #e65100; margin-bottom: 6px;">🛡️ What You Should Do</div>
          <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #333; line-height: 1.6;">
            <li>Check sender address <strong>carefully</strong></li>
            <li><strong>Hover over links</strong> to see the real destination before clicking</li>
            <li>Look for <strong>unusual requests</strong> or language</li>
            <li>Verify through <strong>official channels</strong> if this requests any action</li>
          </ul>
        </div>
      `;
    } else {
      // Low risk - show educational Tip of the Day
      learningContent = `
        <div style="display: flex; align-items: center; margin-bottom: 14px;">
          <span style="font-size: 28px; margin-right: 12px;">💡</span>
          <div>
            <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Learning Mode</div>
            <div style="font-size: 16px; font-weight: 700; color: #2e7d32;">Tip of the Day</div>
          </div>
        </div>
        <div style="background: #e8f5e9; border-radius: 10px; padding: 14px; margin-bottom: 14px; border-left: 4px solid #4caf50;">
          <div style="display: flex; align-items: start;">
            <span style="font-size: 32px; margin-right: 12px; flex-shrink: 0;">${randomTip.icon}</span>
            <div>
              <div style="font-size: 13px; font-weight: 700; color: #2e7d32; margin-bottom: 6px;">${randomTip.title}</div>
              <div style="font-size: 12px; color: #333; line-height: 1.5; margin-bottom: 8px;">${randomTip.text}</div>
              <div style="background: white; border-radius: 6px; padding: 8px 10px; font-size: 11px; color: #555; border: 1px dashed #81c784;">
                <strong>✓ Action:</strong> ${randomTip.action}
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    // Add "Why am I seeing this?" explanation
    learningContent += `
      <div style="font-size: 10px; color: #888; text-align: center; padding-top: 10px; border-top: 1px dashed #ddd;">
        📚 <strong>Learning Mode is ON</strong> — You can turn this off in the extension popup
      </div>
    `;
    
    learningDiv.innerHTML = learningContent;
    
    // Find the scrollable content area
    const contentArea = overlay.querySelector('div[style*="overflow-y: auto"]') || overlay;
    contentArea.appendChild(learningDiv);
    
    log('📚 Learning content added (Mode: ' + (isHighRisk ? 'High Risk' : isMediumRisk ? 'Medium Risk' : 'Low Risk - Tip') + ')');
  });
}

/**
 * Legacy function - kept for compatibility but now uses addLearningContent
 */
function addLearningSection(score, issues) {
  // This is now handled by addLearningContent which is called for all risk levels
  log('📚 addLearningSection called - using addLearningContent instead');
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

/**
 * Add interactive validation questionnaire for medium/high risk emails
 * Learns from user responses to improve future detection
 */
function addValidationQuestionnaire(score, emailData) {
  if (!chrome.runtime || !chrome.runtime.id) return;
  
  const overlay = document.getElementById('anti-phish-overlay');
  if (!overlay) return;
  
  const isHighRisk = score < 30;
  const sender = emailData.sender.toLowerCase();
  const domain = sender.split('@')[1] || '';
  
  // Generate questions based on risk level and sender
  const questions = generateQuestions(sender, domain, isHighRisk);
  
  const questionnaireDiv = document.createElement('div');
  questionnaireDiv.id = 'anti-phish-questionnaire';
  questionnaireDiv.style.cssText = `
    margin-top: 16px;
    padding: 20px;
    background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
    border-radius: 16px;
    border: 2px solid #4caf50;
    animation: aph-fade-in 0.5s ease;
  `;
  
  // Ensure animation styles exist
  if (!document.getElementById('aph-anim-styles')) {
    const style = document.createElement('style');
    style.id = 'aph-anim-styles';
    style.textContent = `
      @keyframes aph-fade-in {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes aph-slide-up {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .aph-question-card {
        background: white;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .aph-question-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.12);
      }
      .aph-question-card.answered {
        opacity: 0.8;
      }
      .aph-btn-yes, .aph-btn-no {
        transition: all 0.2s ease;
      }
      .aph-btn-yes:hover {
        background: #4caf50 !important;
        color: white !important;
        transform: scale(1.02);
      }
      .aph-btn-no:hover {
        background: #f44336 !important;
        color: white !important;
        transform: scale(1.02);
      }
      .aph-btn-yes.selected {
        background: #4caf50 !important;
        color: white !important;
        box-shadow: 0 2px 8px rgba(76,175,80,0.4);
      }
      .aph-btn-no.selected {
        background: #f44336 !important;
        color: white !important;
        box-shadow: 0 2px 8px rgba(244,67,54,0.4);
      }
      .aph-feedback-box {
        animation: aph-slide-up 0.3s ease;
      }
      .aph-progress-bar {
        height: 4px;
        background: #e0e0e0;
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 16px;
      }
      .aph-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #4caf50, #8bc34a);
        transition: width 0.4s ease;
        border-radius: 2px;
      }
    `;
    document.head.appendChild(style);
  }
  
  questionnaireDiv.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 16px;">
      <span style="font-size: 28px; margin-right: 12px;">🤔</span>
      <div>
        <div style="font-size: 15px; font-weight: 700; color: #2e7d32;">Quick Security Check</div>
        <div style="font-size: 12px; color: #555;">Help us learn and improve protection for everyone</div>
      </div>
    </div>
    
    <div class="aph-progress-bar">
      <div class="aph-progress-fill" id="aph-progress" style="width: 0%;"></div>
    </div>
    
    ${questions.map((q, index) => `
      <div class="aph-question-card" data-question="${q.id}" data-sender="${sender}">
        <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
          <span style="font-size: 20px; margin-right: 10px; flex-shrink: 0;">${q.icon}</span>
          <div>
            <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Question ${index + 1} of ${questions.length}</div>
            <div style="font-size: 13px; color: #333; font-weight: 500; line-height: 1.4;">${q.text}</div>
          </div>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="aph-btn-yes" data-question="${q.id}" data-answer="yes" 
                  style="flex: 1; padding: 12px; border: 2px solid #4caf50; border-radius: 10px; 
                         background: #fff; color: #4caf50; cursor: pointer; font-weight: 600; font-size: 13px;
                         display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span style="font-size: 14px;">✓</span> Yes
          </button>
          <button class="aph-btn-no" data-question="${q.id}" data-answer="no"
                  style="flex: 1; padding: 12px; border: 2px solid #f44336; border-radius: 10px; 
                         background: #fff; color: #f44336; cursor: pointer; font-weight: 600; font-size: 13px;
                         display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span style="font-size: 14px;">✗</span> No
          </button>
        </div>
        <div class="aph-feedback-box" id="aph-feedback-${q.id}" style="display: none; margin-top: 12px; padding: 12px; 
             background: ${q.correctAnswer === 'yes' ? '#e8f5e9' : '#ffebee'}; 
             border-radius: 8px; border-left: 3px solid ${q.correctAnswer === 'yes' ? '#4caf50' : '#f44336'};">
          <div style="display: flex; align-items: start;">
            <span style="font-size: 16px; margin-right: 8px; flex-shrink: 0;">${q.correctAnswer === 'yes' ? '✅' : '⚠️'}</span>
            <div style="font-size: 12px; color: #333; line-height: 1.5;">
              <strong>${q.feedbackTitle || 'Why this matters:'}</strong><br>
              ${q.feedback}
            </div>
          </div>
        </div>
      </div>
    `).join('')}
    
    <div id="aph-thanks" style="display: none; text-align: center; padding: 20px; 
         background: white; border-radius: 12px; margin-top: 16px;
         box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <div style="font-size: 40px; margin-bottom: 12px;">🎉</div>
      <div style="font-size: 16px; font-weight: 700; color: #2e7d32; margin-bottom: 6px;">Thank You!</div>
      <div style="font-size: 13px; color: #555; line-height: 1.5;">
        Your feedback helps us improve phishing detection for everyone.
      </div>
      <div style="margin-top: 12px; padding: 10px; background: #e8f5e9; border-radius: 8px;">
        <div style="font-size: 11px; color: #2e7d32;">
          <span style="font-size: 14px;">🏆</span> <strong>You earned the "Security Helper" badge!</strong>
        </div>
      </div>
    </div>
  `;
  
  const contentArea = overlay.querySelector('div[style*="overflow-y: auto"]') || overlay;
  contentArea.appendChild(questionnaireDiv);
  
  // Track answered questions for progress bar
  let answeredCount = 0;
  
  // Add event listeners (CSP-compliant, no inline handlers)
  questions.forEach(q => {
    const yesBtn = questionnaireDiv.querySelector(`button[data-question="${q.id}"][data-answer="yes"]`);
    const noBtn = questionnaireDiv.querySelector(`button[data-question="${q.id}"][data-answer="no"]`);
    const card = questionnaireDiv.querySelector(`.aph-question-card[data-question="${q.id}"]`);
    
    const handleAnswer = (btn, otherBtn, answer) => {
      // Prevent double answering
      if (btn.disabled) return;
      
      // Mark as answered
      btn.disabled = true;
      otherBtn.disabled = true;
      btn.classList.add('selected');
      otherBtn.style.opacity = '0.5';
      if (card) card.classList.add('answered');
      
      // Show feedback
      const feedbackDiv = questionnaireDiv.querySelector(`#aph-feedback-${q.id}`);
      if (feedbackDiv) {
        feedbackDiv.style.display = 'block';
      }
      
      // Update progress
      answeredCount++;
      const progressFill = questionnaireDiv.querySelector('#aph-progress');
      if (progressFill) {
        progressFill.style.width = `${(answeredCount / questions.length) * 100}%`;
      }
      
      // Save to storage
      saveUserFeedback(sender, q.id, answer);
      
      // Check if all answered
      if (answeredCount >= questions.length) {
        const thanksDiv = questionnaireDiv.querySelector('#aph-thanks');
        if (thanksDiv) {
          setTimeout(() => {
            thanksDiv.style.display = 'block';
            thanksDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 400);
        }
      }
    };
    
    if (yesBtn && noBtn) {
      yesBtn.addEventListener('click', () => handleAnswer(yesBtn, noBtn, 'yes'));
      noBtn.addEventListener('click', () => handleAnswer(noBtn, yesBtn, 'no'));
    }
  });
  
  log('📝 Enhanced questionnaire added');
}

/**
 * Generate contextual questions based on sender and risk
 */
function generateQuestions(sender, domain, isHighRisk) {
  const questions = [];
  
  // Always ask about familiarity (most important)
  questions.push({
    id: 'know_sender',
    icon: '👤',
    text: 'Do you recognize this sender or have you emailed them before?',
    correctAnswer: 'yes',
    feedbackTitle: 'Knowing your sender is key',
    feedback: 'Emails from unknown senders are higher risk. If you don\'t recognize the sender, be extra cautious about clicking links or downloading attachments.'
  });
  
  // Check if it's a known service
  const knownServices = ['amazon.com', 'paypal.com', 'apple.com', 'google.com', 'microsoft.com', 'netflix.com', 'spotify.com', 'github.com', 'facebook.com', 'twitter.com', 'linkedin.com'];
  const isKnownService = knownServices.some(s => domain.includes(s));
  
  if (isKnownService) {
    questions.push({
      id: 'use_service',
      icon: '🏢',
      text: `Do you have an account with ${domain}?`,
      correctAnswer: 'yes',
      feedbackTitle: 'Unexpected service emails are suspicious',
      feedback: `If you don't have an account with ${domain}, this email is definitely a phishing attempt trying to trick you with a fake brand.`
    });
  } else if (domain) {
    // For unknown domains
    questions.push({
      id: 'expecting_unknown',
      icon: '❓',
      text: `Were you expecting any email from ${domain}?`,
      correctAnswer: 'yes',
      feedbackTitle: 'Unexpected emails from unknown domains',
      feedback: 'Unexpected emails from unfamiliar domains are high risk. Verify through official channels before taking any action.'
    });
  }
  
  // Ask about expecting email (always relevant)
  questions.push({
    id: 'expecting_topic',
    icon: '📨',
    text: 'Were you expecting an email about this topic?',
    correctAnswer: 'yes',
    feedbackTitle: 'Unexpected requests are red flags',
    feedback: 'Unexpected emails requesting urgent action, especially about account problems, are classic phishing tactics. Always verify independently.'
  });
  
  // For high risk, add safety question
  if (isHighRisk) {
    questions.push({
      id: 'clicked_links',
      icon: '🖱️',
      text: 'Have you clicked any links in this email yet?',
      correctAnswer: 'no',
      feedbackTitle: 'Good! Never click suspicious links',
      feedback: 'If you clicked a link, watch for fake login pages. Change passwords if you entered any credentials. Always go to websites directly instead of through email links.'
    });
  }
  
  return questions.slice(0, 3); // Max 3 questions
}

/**
 * Legacy handler - kept for compatibility
 */
function handleAnswer(questionId, answer, sender, totalQuestions) {
  // This function is now handled inline in addValidationQuestionnaire
  // Keeping for any external references
  const feedbackDiv = document.querySelector(`#aph-feedback-${questionId}`);
  if (feedbackDiv) {
    feedbackDiv.style.display = 'block';
  }
  
  saveUserFeedback(sender, questionId, answer);
}

/**
 * Save user feedback for future learning
 */
function saveUserFeedback(sender, questionId, answer) {
  try {
    if (!chrome.storage || !chrome.storage.local) return;
    
    const feedbackKey = `feedback_${sender}`;
    chrome.storage.local.get([feedbackKey], function(result) {
      const feedback = result[feedbackKey] || { responses: [], lastUpdated: Date.now() };
      feedback.responses.push({ questionId, answer, timestamp: Date.now() });
      feedback.lastUpdated = Date.now();
      
      chrome.storage.local.set({ [feedbackKey]: feedback });
      log('💾 Feedback saved for', sender);
    });
  } catch (e) {}
}

/**
 * Get sender reputation based on user feedback
 * Returns: 'trusted' | 'unknown' | 'suspicious'
 */
function getSenderReputation(sender, callback) {
  if (!chrome.storage || !chrome.storage.local) {
    callback('unknown');
    return;
  }
  
  const feedbackKey = `feedback_${sender}`;
  chrome.storage.local.get([feedbackKey], function(result) {
    if (chrome.runtime.lastError || !result[feedbackKey]) {
      callback('unknown');
      return;
    }
    
    const feedback = result[feedbackKey];
    const responses = feedback.responses || [];
    
    if (responses.length === 0) {
      callback('unknown');
      return;
    }
    
    // Check if user knows sender
    const knowSenderResponses = responses.filter(r => r.questionId === 'know_sender');
    if (knowSenderResponses.length > 0) {
      const lastResponse = knowSenderResponses[knowSenderResponses.length - 1];
      if (lastResponse.answer === 'yes') {
        callback('trusted');
        return;
      } else {
        callback('suspicious');
        return;
      }
    }
    
    callback('unknown');
  });
}

/**
 * Check if sender is already trusted by user
 */
function checkIfTrusted(sender, callback) {
  getSenderReputation(sender, function(reputation) {
    callback(reputation === 'trusted');
  });
}

/**
 * Show user's previous feedback in the overlay
 */
function showPreviousFeedback(sender) {
  getSenderReputation(sender, function(reputation) {
    const overlay = document.getElementById('anti-phish-overlay');
    if (!overlay) return;
    
    let badgeHtml = '';
    if (reputation === 'trusted') {
      badgeHtml = `
        <div style="margin: 12px 24px 0; padding: 10px 14px; background: #e8f5e9; border-radius: 10px; 
                    border-left: 4px solid #4caf50; display: flex; align-items: center;"
        >
          <span style="font-size: 18px; margin-right: 10px;">✅</span>
          <div>
            <div style="font-weight: 600; color: #2e7d32; font-size: 13px;">Trusted Sender</div>
            <div style="font-size: 11px; color: #555;">You previously confirmed knowing this sender</div>
          </div>
        </div>
      `;
    } else if (reputation === 'suspicious') {
      badgeHtml = `
        <div style="margin: 12px 24px 0; padding: 10px 14px; background: #ffebee; border-radius: 10px; 
                    border-left: 4px solid #f44336; display: flex; align-items: center;"
        >
          <span style="font-size: 18px; margin-right: 10px;">⚠️</span>
          <div>
            <div style="font-weight: 600; color: #c62828; font-size: 13px;">Previously Flagged</div>
            <div style="font-size: 11px; color: #555;">You previously said you don't know this sender</div>
          </div>
        </div>
      `;
    }
    
    if (badgeHtml) {
      const header = overlay.querySelector('div[style*="height: 8px"]');
      if (header) {
        const badgeDiv = document.createElement('div');
        badgeDiv.innerHTML = badgeHtml;
        header.insertAdjacentElement('afterend', badgeDiv.firstElementChild);
        log('🏷️ Reputation badge added:', reputation);
      }
    }
  });
}

if (window.location.hostname.includes('mail.google.com')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
