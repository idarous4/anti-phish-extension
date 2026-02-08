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
    top: 20px;
    right: 20px;
    width: 360px;
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 25px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.05);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    overflow: hidden;
    animation: aph-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  `;
  
  // Add animation
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
    `;
    document.head.appendChild(style);
  }

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
    <!-- Header with colored bar -->
    <div style="height: 8px; background: ${color};"></div>
    
    <!-- Content -->
    <div style="padding: 24px;">
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
          <div style="font-size: 20px; font-weight: 700; color: ${color};">${title}</div>
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
      
      ${issues.length > 0 ? `
        <!-- Issues List -->
        <div style="background: #fafafa; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <div style="font-size: 12px; color: ${color}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
            ⚠️ ${issues.length} Issue${issues.length > 1 ? 's' : ''} Detected
          </div>
          ${issues.map(i => `
            <div style="
              display: flex; align-items: flex-start; 
              padding: 10px 0; border-bottom: 1px solid #eee;
            ">
              <span style="margin-right: 10px; flex-shrink: 0;">${i.split(' ')[0]}</span>
              <span style="font-size: 13px; color: #444; line-height: 1.4;">${i.substring(i.indexOf(' ') + 1)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <!-- Buttons -->
      <div style="display: flex; gap: 12px;">
        <button id="aph-dismiss" style="
          flex: 1; padding: 14px; border: 1.5px solid #ddd; border-radius: 12px;
          background: #fff; color: #555; cursor: pointer; font-weight: 600; font-size: 14px;
          transition: all 0.2s;
        ">Dismiss</button>
        <button id="aph-report" style="
          flex: 1; padding: 14px; border: none; border-radius: 12px;
          background: ${color}; color: white; cursor: pointer; font-weight: 600; font-size: 14px;
          transition: all 0.2s; box-shadow: 0 4px 15px ${color}40;
        ">Report</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Add learning section if risk is medium/high
  if (score < 70) {
    addLearningSection(score, issues);
    // Add interactive questionnaire for medium/high risk
    setTimeout(() => addValidationQuestionnaire(score, emailData), 500);
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
    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
    border-radius: 16px;
    border: 2px solid #2196f3;
    animation: aph-fade-in 0.5s ease;
  `;
  
  if (!document.getElementById('aph-anim-styles')) {
    const style = document.createElement('style');
    style.id = 'aph-anim-styles';
    style.textContent += `
      @keyframes aph-fade-in {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }
  
  questionnaireDiv.innerHTML = `
    <div style="font-size: 15px; font-weight: 700; color: #1565c0; margin-bottom: 12px; display: flex; align-items: center;">
      <span style="font-size: 20px; margin-right: 8px;">🤔</span>
      Quick Verification
    </div>
    <div style="font-size: 12px; color: #424242; margin-bottom: 16px; line-height: 1.5;">
      Help us learn! Answer these to improve detection:
    </div>
    
    ${questions.map((q, index) => `
      <div class="aph-question" data-question="${q.id}" style="margin-bottom: 16px;">
        <div style="font-size: 13px; font-weight: 600; color: #333; margin-bottom: 10px;">
          ${index + 1}. ${q.text}
        </div>
        <div style="display: flex; gap: 8px;">
          <button onclick="window.aphAnswer('${q.id}', 'yes', '${sender}')" 
                  style="flex: 1; padding: 10px; border: 2px solid #4caf50; border-radius: 10px; 
                         background: #fff; color: #4caf50; cursor: pointer; font-weight: 600; font-size: 13px;
                         transition: all 0.2s;"
                  onmouseover="this.style.background='#4caf50'; this.style.color='#fff';"
                  onmouseout="this.style.background='#fff'; this.style.color='#4caf50';">
            ✓ Yes
          </button>
          <button onclick="window.aphAnswer('${q.id}', 'no', '${sender}')" 
                  style="flex: 1; padding: 10px; border: 2px solid #f44336; border-radius: 10px; 
                         background: #fff; color: #f44336; cursor: pointer; font-weight: 600; font-size: 13px;
                         transition: all 0.2s;"
                  onmouseover="this.style.background='#f44336'; this.style.color='#fff';"
                  onmouseout="this.style.background='#fff'; this.style.color='#f44336';">
            ✗ No
          </button>
        </div>
        <div class="aph-feedback-${q.id}" style="display: none; margin-top: 10px; padding: 10px; 
             background: ${q.correctAnswer === 'yes' ? '#e8f5e9' : '#ffebee'}; 
             border-radius: 8px; font-size: 12px; color: #333;">
          <strong>💡 ${q.feedback}</strong>
        </div>
      </div>
    `).join('')}
    
    <div id="aph-thanks" style="display: none; text-align: center; padding: 15px; 
         background: #e8f5e9; border-radius: 12px; margin-top: 15px;">
      <div style="font-size: 24px; margin-bottom: 8px;">🎉</div>
      <div style="font-size: 14px; font-weight: 600; color: #2e7d32;">Thanks for helping us learn!</div>
      <div style="font-size: 12px; color: #555; margin-top: 5px;">Your feedback improves detection for everyone.</div>
    </div>
  `;
  
  overlay.appendChild(questionnaireDiv);
  
  // Store answer handler globally
  window.aphAnswer = function(questionId, answer, sender) {
    const feedbackDiv = document.querySelector(`.aph-feedback-${questionId}`);
    if (feedbackDiv) {
      feedbackDiv.style.display = 'block';
    }
    
    // Save to storage for learning
    saveUserFeedback(sender, questionId, answer);
    
    // Check if all answered
    const allAnswered = document.querySelectorAll('[class^="aph-feedback-"]:not([style*="display: none"])').length;
    if (allAnswered >= questions.length) {
      document.getElementById('aph-thanks').style.display = 'block';
    }
  };
  
  log('📝 Questionnaire added');
}

/**
 * Generate contextual questions based on sender
 */
function generateQuestions(sender, domain, isHighRisk) {
  const questions = [];
  
  // Always ask about familiarity
  questions.push({
    id: 'know_sender',
    text: 'Do you recognize this sender or have you emailed them before?',
    correctAnswer: 'yes',
    feedback: 'Knowing the sender reduces risk. If NO, be extra cautious!'
  });
  
  // Check if it's a known service
  const knownServices = ['amazon.com', 'paypal.com', 'apple.com', 'google.com', 'microsoft.com', 'netflix.com', 'spotify.com', 'github.com'];
  const isKnownService = knownServices.some(s => domain.includes(s));
  
  if (isKnownService) {
    questions.push({
      id: 'use_service',
      text: `Do you have an account with ${domain}?`,
      correctAnswer: 'yes',
      feedback: 'If you don\'t have an account with them, this is definitely phishing!'
    });
  }
  
  // Ask about expecting email
  questions.push({
    id: 'expecting',
    text: 'Were you expecting an email about this topic?',
    correctAnswer: 'yes',
    feedback: 'Unexpected emails requesting action are major red flags!'
  });
  
  // For high risk, add more questions
  if (isHighRisk) {
    questions.push({
      id: 'clicked_links',
      text: 'Have you clicked any links in this email yet?',
      correctAnswer: 'no',
      feedback: 'Good! Never click links in suspicious emails. Go to the website directly.'
    });
  }
  
  return questions.slice(0, 3); // Max 3 questions
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

if (window.location.hostname.includes('mail.google.com')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
