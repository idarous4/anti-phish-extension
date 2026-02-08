:: ============================================================================
:: WINDOWS SETUP SCRIPT FOR ANTI-PHISH EXTENSION
:: ============================================================================
:: 
:: WHAT IS THIS FILE?
:: This is a Windows batch script that automates some setup steps.
:: Run it by double-clicking, or right-click → "Run as administrator"
::
:: WHAT DOES IT DO?
:: 1. Checks if Node.js is installed
:: 2. Checks if npm is working
:: 3. Creates project folders
:: 4. Runs npm install
:: 5. Verifies everything is ready
::
:: DO I NEED TO RUN THIS?
:: No - you can do everything manually following SETUP_GUIDE.md
:: But this script makes it faster and checks for errors
:: ============================================================================

@echo off
cls
echo.
echo ========================================
echo  ANTI-PHISH EXTENSION SETUP
echo ========================================
echo.

:: Check if we're running as admin (needed for some operations)
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running as Administrator
) else (
    echo [INFO] Not running as Administrator (this is fine for most steps)
)
echo.

:: ==========================================================================
:: STEP 1: CHECK NODE.JS
:: ==========================================================================
echo [1/5] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    echo.
    echo Please install Node.js first:
    echo 1. Go to https://nodejs.org
    echo 2. Download the LTS version
    echo 3. Run the installer
    echo 4. Restart your computer
    echo 5. Run this script again
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%a in ('node --version') do set NODE_VERSION=%%a
    echo [OK] Node.js found: %NODE_VERSION%
)

:: ==========================================================================
:: STEP 2: CHECK NPM
:: ==========================================================================
echo [2/5] Checking npm installation...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found!
    echo Node.js should include npm. Please reinstall Node.js.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%a in ('npm --version') do set NPM_VERSION=%%a
    echo [OK] npm found: %NPM_VERSION%
)

:: ==========================================================================
:: STEP 3: CREATE FOLDER STRUCTURE
:: ==========================================================================
echo [3/5] Creating folder structure...

if not exist "src" (
    mkdir src
    echo [OK] Created src\ folder
) else (
    echo [OK] src\ folder already exists
)

if not exist "models" (
    mkdir models
    echo [OK] Created models\ folder
) else (
    echo [OK] models\ folder already exists
)

if not exist "icons" (
    mkdir icons
    echo [OK] Created icons\ folder
) else (
    echo [OK] icons\ folder already exists
)

if not exist "dist" (
    mkdir dist
    echo [OK] Created dist\ folder (for built extension)
) else (
    echo [OK] dist\ folder already exists
)

:: ==========================================================================
:: STEP 4: INSTALL NPM PACKAGES
:: ==========================================================================
echo [4/5] Installing npm packages...
echo This may take 2-5 minutes depending on your internet speed...
echo.

if exist "node_modules" (
    echo [INFO] node_modules already exists. Skipping npm install.
    echo [TIP] If you want to reinstall, delete node_modules folder and run this again.
) else (
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] npm install failed!
        echo Common fixes:
        echo 1. Check your internet connection
        echo 2. Run: npm cache clean --force
        echo 3. Delete package-lock.json and try again
        pause
        exit /b 1
    ) else (
        echo [OK] npm packages installed successfully
    )
)

:: ==========================================================================
:: STEP 5: VERIFY SETUP
:: ==========================================================================
echo [5/5] Verifying setup...
echo.

set ERRORS=0

:: Check manifest.json
if exist "manifest.json" (
    echo [OK] manifest.json found
) else (
    echo [ERROR] manifest.json not found!
    set /a ERRORS+=1
)

:: Check package.json
if exist "package.json" (
    echo [OK] package.json found
) else (
    echo [ERROR] package.json not found!
    set /a ERRORS+=1
)

:: Check node_modules
if exist "node_modules" (
    echo [OK] node_modules folder found
) else (
    echo [ERROR] node_modules not found! Run 'npm install'
    set /a ERRORS+=1
)

:: Check for TensorFlow
if exist "node_modules\@tensorflow\tfjs" (
    echo [OK] TensorFlow.js installed
) else (
    echo [WARNING] TensorFlow.js not found in node_modules
    echo You may need to run: npm install @tensorflow/tfjs
)

:: ==========================================================================
:: SUMMARY
:: ==========================================================================
echo.
echo ========================================
echo  SETUP SUMMARY
:: ========================================
echo.

if %ERRORS% == 0 (
    echo [SUCCESS] All checks passed!
    echo.
    echo Next steps:
    echo 1. Open this folder in VS Code
    echo 2. Create icons (see SETUP_GUIDE.md)
    echo 3. Open Chrome and go to chrome://extensions
    echo 4. Enable "Developer mode"
    echo 5. Click "Load unpacked"
    echo 6. Select this folder
    echo.
    echo Ready to start coding!
) else (
    echo [WARNING] Setup completed with %ERRORS% error(s)
    echo.
    echo Please fix the errors above, then run this script again.
)

echo.
echo Press any key to exit...
pause >nul
