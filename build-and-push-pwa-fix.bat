@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"
echo.
echo === STEP 1: Verify index.html is complete ===
findstr /n "link rel" index.html
echo.
echo === STEP 2: npm run build ===
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo BUILD FAILED. Check errors above. Do not push.
    pause
    exit /b 1
)
echo.
echo === BUILD PASSED ===
echo.
echo === STEP 3: git add and commit ===
git add index.html public/site.webmanifest public/favicon.ico public/favicon-16x16.png public/favicon-32x32.png public/apple-touch-icon.png public/android-chrome-192x192.png public/android-chrome-512x512.png public/maskable-icon-512x512.png
git commit -m "fix: complete index.html icon links and add PWA manifest + icons for Android home screen"
echo.
echo === STEP 4: git push ===
git push origin grassroots-clean-recovery-base
echo.
echo === Done — check Render dashboard for deploy status ===
pause
