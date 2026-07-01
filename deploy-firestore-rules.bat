@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"

echo ============================================================
echo  GrassRoots — Deploy Firestore Security Rules to Firebase
echo ============================================================
echo.
echo  Project : gen-lang-client-0207351054
echo  Database: ai-studio-e9bfaa37-43fb-46f5-bcf0-c0a5adc17337
echo  Rules   : firestore.rules
echo ============================================================
echo.

echo Checking Firebase CLI...
firebase --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo ERROR: Firebase CLI not found.
  echo Install it with:  npm install -g firebase-tools
  echo Then log in with: firebase login
  echo Then re-run this script.
  pause
  exit /b 1
)

echo Checking login status...
firebase projects:list >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Not logged in. Running firebase login...
  firebase login
  if %ERRORLEVEL% NEQ 0 (
    echo Login failed. Fix and re-run.
    pause
    exit /b 1
  )
)

echo.
echo Deploying Firestore rules...
firebase deploy --only firestore:rules
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo DEPLOY FAILED.
  echo.
  echo If you see "database not found", the named database may need
  echo to be targeted explicitly. Try:
  echo.
  echo   firebase firestore:rules --database ai-studio-e9bfaa37-43fb-46f5-bcf0-c0a5adc17337
  echo.
  echo Or go to Firebase Console and paste firestore.rules manually:
  echo https://console.firebase.google.com/project/gen-lang-client-0207351054/firestore/rules
  echo.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  Rules deployed successfully.
echo.
echo  Verify at Firebase Console:
echo  Firestore ^> Rules tab
echo.
echo  After deploy — test in the app:
echo    1. Admin opens /schedule
echo    2. Enters a date + Full Day + reason
echo    3. Clicks + BLOCK
echo    4. Block appears in Active Blocks list
echo    5. Refresh page — block is still there
echo ============================================================
pause
