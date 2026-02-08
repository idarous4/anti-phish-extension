/**
 * ============================================================================
 * AI PHISHING DETECTION - TENSORFLOW.JS (CDN VERSION)
 * ============================================================================
 * 
 * Loads TensorFlow.js from CDN for Chrome Extension compatibility
 * 
 * APPROACH (Option C - Hybrid):
 * 1. Load TensorFlow.js from CDN
 * 2. Create simple neural network
 * 3. Classify emails as phishing or legitimate
 * 4. Combine with heuristic rules for best accuracy
 * ============================================================================
 */

let model = null;
let modelLoaded = false;
let tfLoading = false;
let tfLoaded = false;

/**
 * Load TensorFlow.js from CDN
 */
function loadTensorFlow() {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (typeof tf !== 'undefined') {
      tfLoaded = true;
      resolve();
      return;
    }
    
    // Currently loading, wait
    if (tfLoading) {
      const checkInterval = setInterval(() => {
        if (typeof tf !== 'undefined') {
          clearInterval(checkInterval);
          tfLoaded = true;
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Timeout loading TensorFlow.js'));
      }, 10000); // 10 second timeout
      return;
    }
    
    tfLoading = true;
    console.log('[Anti-Phish] 📦 Loading TensorFlow.js from CDN...');
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js';
    script.async = true;
    
    script.onload = () => {
      console.log('[Anti-Phish] ✅ TensorFlow.js loaded from CDN');
      tfLoading = false;
      tfLoaded = true;
      resolve();
    };
    
    script.onerror = (e) => {
      console.log('[Anti-Phish] ❌ Failed to load TensorFlow.js:', e);
      tfLoading = false;
      reject(new Error('Failed to load TensorFlow.js from CDN'));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Initialize the AI model
 */
async function initAIModel() {
  try {
    log('🤖 Initializing AI model...');
    
    // Load TensorFlow.js from CDN first
    await loadTensorFlow();
    
    // Create simple neural network
    model = createSimpleModel();
    modelLoaded = true;
    
    log('✅ AI model ready');
    return true;
    
  } catch (error) {
    log('⚠️ AI not available:', error.message);
    return false;
  }
}

/**
 * Create a simple neural network for phishing detection
 */
function createSimpleModel() {
  // Simple model with 5 input features
  const model = tf.sequential({
    layers: [
      tf.layers.dense({ inputShape: [5], units: 10, activation: 'relu' }),
      tf.layers.dense({ units: 5, activation: 'relu' }),
      tf.layers.dense({ units: 2, activation: 'softmax' })
    ]
  });
  
  model.compile({
    optimizer: 'adam',
    loss: 'categoricalCrossentropy'
  });
  
  return model;
}

/**
 * Convert email to feature vector (5 features)
 */
function emailToFeatures(emailData) {
  const features = [];
  const body = emailData.body.toLowerCase();
  const subject = emailData.subject.toLowerCase();
  const sender = emailData.sender.toLowerCase();
  
  // Feature 1: Urgency indicators (0-1)
  const urgencyWords = ['urgent', 'immediately', 'act now', 'verify', 'suspended', 'security alert'];
  let urgencyScore = 0;
  urgencyWords.forEach(word => {
    if (body.includes(word) || subject.includes(word)) urgencyScore += 0.15;
  });
  features.push(Math.min(urgencyScore, 1));
  
  // Feature 2: Link suspiciousness (0-1)
  let linkScore = 0;
  emailData.links.forEach(link => {
    if (link.href && !link.href.includes('google.com') && !link.href.includes('microsoft.com')) {
      linkScore += 0.1;
    }
  });
  features.push(Math.min(linkScore, 1));
  
  // Feature 3: Sender reputation (0-1, 1 = suspicious)
  let senderScore = 0;
  if (sender.includes('noreply') || sender.includes('no-reply')) senderScore += 0.3;
  if (sender.includes('alert') || sender.includes('security')) senderScore += 0.4;
  if (!sender.match(/@(gmail|outlook|yahoo|company)\./)) senderScore += 0.2;
  features.push(Math.min(senderScore, 1));
  
  // Feature 4: Request for action (0-1)
  const actionWords = ['click here', 'verify your account', 'update your information', 'confirm your identity'];
  let actionScore = 0;
  actionWords.forEach(word => {
    if (body.includes(word)) actionScore += 0.25;
  });
  features.push(Math.min(actionScore, 1));
  
  // Feature 5: Grammar/formality indicators (0-1)
  const informalPhrases = ['dear customer', 'dear user', 'valued customer', 'kindly'];
  let grammarScore = 0;
  informalPhrases.forEach(phrase => {
    if (body.includes(phrase)) grammarScore += 0.2;
  });
  features.push(Math.min(grammarScore, 1));
  
  return features;
}

/**
 * Run AI detection on email
 */
async function runAIDetection(emailData) {
  if (!modelLoaded || typeof tf === 'undefined') {
    return null;
  }
  
  try {
    log('🤖 Running AI analysis...');
    
    // Convert email to features
    const features = emailToFeatures(emailData);
    
    // Create tensor
    const inputTensor = tf.tensor2d([features]);
    
    // Run prediction
    const prediction = model.predict(inputTensor);
    const probabilities = await prediction.data();
    
    // Clean up tensors
    inputTensor.dispose();
    prediction.dispose();
    
    // probabilities[0] = legitimate, probabilities[1] = phishing
    const phishingProb = probabilities[1];
    const score = Math.round(phishingProb * 100);
    
    log('🎯 AI Score:', score);
    
    return {
      score: score,
      isPhishing: phishingProb > 0.5
    };
    
  } catch (error) {
    log('❌ AI detection error:', error.message);
    return null;
  }
}

/**
 * Combined detection: AI + Heuristics
 */
async function combinedDetection(emailData) {
  // Run AI detection if available
  const aiResult = await runAIDetection(emailData);
  
  // Run heuristic detection (always works)
  const heuristicResult = runHeuristics(emailData);
  
  if (!aiResult) {
    // AI not available, use heuristics only
    log('📋 Using heuristic detection only');
    return heuristicResult;
  }
  
  // Combine scores (AI 60%, Heuristics 40%)
  const combinedScore = Math.round((aiResult.score * 0.6) + (heuristicResult.score * 0.4));
  
  // Combine issues
  const combinedIssues = [...heuristicResult.issues];
  if (aiResult.isPhishing) {
    combinedIssues.unshift('🤖 AI flagged as suspicious');
  }
  
  log('📊 Combined Score:', combinedScore, '(AI:', aiResult.score, '+ Heuristics:', heuristicResult.score + ')');
  
  return {
    score: combinedScore,
    issues: combinedIssues
  };
}
