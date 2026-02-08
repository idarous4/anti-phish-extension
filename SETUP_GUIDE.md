# 🛡️ Anti-Phish Extension - Setup Guide
## Windows 11 Step-by-Step Instructions

---

## ✅ PREREQUISITES - WHAT YOU NEED

Before we start, make sure you have:

| Requirement | Why You Need It | Check |
|-------------|-----------------|-------|
| **Windows 11** | Your operating system | ✅ You have this |
| **Chrome Browser** | To test the extension | Install from google.com/chrome |
| **Node.js** | To download libraries | Install below |
| **VS Code** | Code editor | Install below |
| **Git** (optional) | For version control | Install below |

---

## 📥 STEP 1: INSTALL NODE.JS

### What is Node.js?
It's a tool that lets us run JavaScript on your computer (not just in browser).
We use it to download TensorFlow.js and other libraries.

### Installation:

1. **Open your browser**
2. **Go to:** https://nodejs.org
3. **Download the LTS version** (Long Term Support - it's the stable one)
   - Click the big green "18.x.x LTS" button
   - File: `node-v18.x.x-x64.msi`
4. **Run the installer**
   - Double-click the downloaded `.msi` file
   - Click "Next" through all the prompts
   - **IMPORTANT:** Check the box that says "Automatically install necessary tools"
   - Click "Install"
5. **Restart your computer** (important!)

### Verify Installation:
1. Press `Windows Key + R`
2. Type `cmd` and press Enter
3. In the black window, type:
   ```
   node --version
   ```
4. You should see something like: `v18.19.0`
5. Now type:
   ```
   npm --version
   ```
6. You should see something like: `10.2.3`

✅ **If you see version numbers, Node.js is installed!**

---

## 📥 STEP 2: INSTALL VISUAL STUDIO CODE

### What is VS Code?
It's where we write and edit our code. Think of it like Microsoft Word but for programming.

### Installation:

1. **Go to:** https://code.visualstudio.com
2. **Download:** Click the big blue "Download for Windows" button
3. **Run the installer**
   - Double-click `VSCodeUserSetup-x64.exe`
   - Accept the agreement
   - Click "Next" through prompts
   - **IMPORTANT:** Check these boxes:
     - ☑ "Add to PATH"
     - ☑ "Register Code as an editor for supported file types"
     - ☑ "Add 'Open with Code' action to Windows Explorer"
   - Click "Install"
4. **Launch VS Code** when done

### Recommended Extensions (we'll install these later):
- ESLint (code checking)
- Prettier (code formatting)
- Chrome Extension DevTools

---

## 📥 STEP 3: INSTALL GIT (OPTIONAL BUT RECOMMENDED)

### What is Git?
It saves versions of your code. Like "Save As" but for every change.
If you break something, you can go back to when it worked.

### Installation:

1. **Go to:** https://git-scm.com/download/win
2. **Download:** 64-bit Git for Windows Setup
3. **Run the installer**
   - Click "Next" many times (default settings are fine)
   - When you see "Choosing the default editor", select "Use Visual Studio Code"
   - Keep clicking "Next" until "Install"
4. **Verify:** Open Command Prompt (cmd) and type:
   ```
   git --version
   ```
   Should see: `git version 2.x.x`

---

## 📂 STEP 4: CREATE PROJECT FOLDER

1. **Open File Explorer**
2. **Go to:** `C:\` (or wherever you want to store it)
3. **Right-click → New → Folder**
4. **Name it:** `anti-phish-extension`
5. **Double-click** to open the folder

---

## 📋 STEP 5: DOWNLOAD PROJECT FILES

### Option A: If I sent you files (EASIEST)

1. **Copy all files** I provided (manifest.json, package.json, etc.)
2. **Paste them** into `C:\anti-phish-extension`
3. Make sure folder structure looks like:
   ```
   C:\anti-phish-extension\
   ├── manifest.json
   ├── package.json
   ├── src\
   │   └── (content scripts will go here)
   ├── models\
   │   └── (AI model will go here)
   └── icons\
       └── (icons will go here)
   ```

### Option B: Using Git (if you installed it)

1. Open Command Prompt
2. Type:
   ```
   cd C:\
   git clone https://github.com/yourusername/anti-phish-extension.git
   ```

---

## 📦 STEP 6: INSTALL DEPENDENCIES

This downloads TensorFlow.js and other libraries we need.

1. **Open Command Prompt**
   - Press `Windows Key + R`
   - Type `cmd`
   - Press Enter

2. **Navigate to your project folder:**
   ```
   cd C:\anti-phish-extension
   ```

3. **Install everything:**
   ```
   npm install
   ```
   
   **What this does:**
   - Downloads TensorFlow.js (~2MB)
   - Downloads other libraries
   - Creates a `node_modules` folder (this will be BIG ~50MB)
   - Creates `package-lock.json` file

4. **Wait for it to finish** (2-5 minutes depending on internet)
   - You'll see lots of text scrolling
   - When you see the prompt again (`C:\anti-phish-extension>`), it's done

✅ **If no red errors, dependencies installed!**

---

## 🔧 STEP 7: OPEN IN VS CODE

1. **Open VS Code**
2. **Click File → Open Folder**
3. **Navigate to:** `C:\anti-phish-extension`
4. **Click "Select Folder"**
5. You should see the file tree on the left:
   ```
   ANTI-PHISH-EXTENSION
   ├── manifest.json
   ├── package.json
   ├── node_modules
   ├── src
   ├── models
   └── icons
   ```

---

## 🧪 STEP 8: LOAD EXTENSION IN CHROME (TESTING)

Before we finish coding, let's test that Chrome can load our extension.

1. **Open Chrome**
2. **Type in address bar:** `chrome://extensions`
3. **Turn ON "Developer mode"** (toggle in top right)
4. **Click "Load unpacked"** (button that appears)
5. **Navigate to:** `C:\anti-phish-extension`
6. **Click "Select Folder"**

### What You Should See:
- A new card appears with "Anti-Phish Shield"
- Version: 1.0.0
- Description: "AI-powered phishing detection..."
- Toggle switch is ON

✅ **Extension loaded successfully!**

---

## 🎨 STEP 9: CREATE ICONS

We need icons for the extension. For now, let's create simple ones.

### Option A: Download Free Icons
1. Go to https://flaticon.com
2. Search "shield" or "security"
3. Download PNG in sizes: 16x16, 48x48, 128x128
4. Save to `C:\anti-phish-extension\icons\`
   - Rename to: `icon16.png`, `icon48.png`, `icon128.png`

### Option B: I'll Create Simple Icons
Tell me: What color scheme do you want?
- Blue shield (professional)
- Red warning (attention-grabbing)
- Green checkmark (positive/trust)
- Custom (tell me your idea)

---

## 🧠 STEP 10: GET AI MODEL

We need a trained model to detect phishing. Options:

### Option A: Use Pre-trained (FAST)
I can provide a pre-trained TensorFlow.js model (~3MB)
You just download and put in `models/` folder

### Option B: Train Custom (BETTER, but takes time)
- Better accuracy for your specific needs
- Requires Python + Google Colab
- Takes 2-3 hours

**Which do you want?**
- A) Quick start with pre-trained model
- B) Train custom model for better accuracy

---

## ✅ VERIFICATION CHECKLIST

Before we continue to Phase 2, confirm:

- [ ] Node.js installed (run `node --version`)
- [ ] npm installed (run `npm --version`)
- [ ] VS Code installed and opened
- [ ] Project folder created at `C:\anti-phish-extension`
- [ ] manifest.json in folder
- [ ] package.json in folder
- [ ] Ran `npm install` (node_modules folder exists)
- [ ] Extension loads in Chrome (`chrome://extensions`)
- [ ] Icons created (or ready to download)

---

## 🚨 TROUBLESHOOTING

### Problem: "'node' is not recognized"
**Solution:** Restart computer, or reinstall Node.js and check "Add to PATH"

### Problem: "npm install" fails with errors
**Solution:** 
1. Delete `node_modules` folder
2. Delete `package-lock.json` file
3. Run `npm install` again

### Problem: Extension doesn't load in Chrome
**Solution:**
1. Check that `manifest.json` is valid JSON (no missing commas)
2. Check Chrome console for errors (F12 → Console)
3. Make sure all required files exist

### Problem: "Cannot find module '@tensorflow/tfjs'"
**Solution:** Run `npm install` again in the project folder

---

## 📞 NEED HELP?

If you get stuck on any step:
1. Take a screenshot of the error
2. Tell me which step you're on
3. I'll help you fix it

**Ready to proceed?** Confirm you've completed Steps 1-10, then I'll give you the code files.

---

## 🎯 NEXT PHASE

After setup complete, we'll code:
1. **Phase 2:** Content script for Gmail
2. **Phase 3:** Phishing detection logic
3. **Phase 4:** UI overlay
4. **Phase 5:** Outlook support

Let's get this extension built! 🛡️
