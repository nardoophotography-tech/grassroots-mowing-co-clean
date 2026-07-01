@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"

echo ============================================================
echo  GrassRoots — Block Button Fix
echo  Files: firebase.json, .firebaserc, useFirebase.ts
echo ============================================================
echo.

echo Building...
call npm run build
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo BUILD FAILED — fix errors above before pushing.
  pause
  exit /b 1
)
echo Build OK.
echo.

echo Staging files...
git add firebase.json
git add .firebaserc
git add src/hooks/useFirebase.ts
git add deploy-firestore-rules.bat

echo.
echo Files staged:
git diff --cached --name-only
echo.

git commit -m "fix: add firebase.json/.firebaserc for rules deploy + harden updateBookingSettings auth check"

git push origin grassroots-clean-recovery-base

echo.
echo ============================================================
echo  STEP 1 DONE: Code pushed to GitHub / Render will redeploy.
echo.
echo  STEP 2 REQUIRED — Deploy Firestore rules to Firebase:
echo  Run deploy-firestore-rules.bat
echo.
echo  Without this step, the + BLOCK button will still fail.
echo  Render deployment does NOT deploy Firebase rules.
echo ============================================================
pause
