@echo off
echo ================================================================
echo  BUILD — Remove TEST VERSION banner from production
echo.
echo  ROOT CAUSE: VITE_LAUNCH_MODE is a build-time env var.
echo  Old condition: !== 'live' — always true when var not set.
echo  New condition: === 'test' — hidden by default, opt-in to show.
echo ================================================================
cd /d C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE

echo [1/4] Building...
call npm run build
IF ERRORLEVEL 1 (
    echo BUILD FAILED — fix errors above.
    pause
    exit /b 1
)

echo [2/4] Verify banner string NOT in dist bundle...
findstr /R "friend testing" dist\assets\*.js >nul 2>&1
IF NOT ERRORLEVEL 1 (
    echo.
    echo *** FAIL: Banner text found in dist bundle — banner will still show ***
    pause
    exit /b 1
) ELSE (
    echo   PASS — banner text not found in dist bundle
)

echo [3/4] Commit and push...
git add src/App.tsx
git commit -m "fix: hide TEST VERSION banner by default — only show when VITE_LAUNCH_MODE=test"
git push
IF ERRORLEVEL 1 (
    echo PUSH FAILED.
    pause
    exit /b 1
)

echo [4/4] Done.
echo.
echo ================================================================
echo  NEXT: Wait 2-3 min for Render to deploy, then:
echo    1. Open https://grassroots-mowing-co-au.onrender.com/dashboard
echo    2. Hard refresh (Ctrl+F5)
echo    3. Confirm yellow TEST VERSION banner is GONE
echo.
echo  To show banner locally: add VITE_LAUNCH_MODE=test to .env.local
echo ================================================================
pause
