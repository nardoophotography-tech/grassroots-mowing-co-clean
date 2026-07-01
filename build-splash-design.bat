@echo off
cd /d C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE
echo ================================================================
echo  BUILD — Indigenous Design System + SplashGate
echo ================================================================
echo.

echo [1/4] Building...
call npm run build
IF ERRORLEVEL 1 (
    echo.
    echo *** BUILD FAILED — fix TypeScript errors above ***
    pause
    exit /b 1
)
echo BUILD_RESULT=PASS

echo.
echo [2/4] Quick bundle scan...
findstr /c:"SplashGate" dist\assets\*.js >nul 2>&1
IF NOT ERRORLEVEL 1 (
    echo   SPLASH_SCAN=PASS - SplashGate code present in bundle
) ELSE (
    echo   SPLASH_SCAN=WARN - SplashGate not found in bundle ^(check import^)
)

echo.
echo [3/4] Committing changes...
git add src/App.tsx src/components/SplashGate.tsx public/assets/mines-horizon.svg public/assets/dot-art-pattern.svg
git status
git commit -m "feat: indigenous design system — SplashGate entry screen, Mount Isa mines horizon, dot-art pattern overlays"
IF ERRORLEVEL 1 (
    echo   Note: nothing new to commit or commit error
)

echo.
echo [4/4] Pushing to GitHub...
git push
IF ERRORLEVEL 1 (
    echo *** PUSH FAILED ***
    pause
    exit /b 1
)
echo PUSH_RESULT=PASS

echo.
echo ================================================================
echo  DONE — Render will redeploy in ~2-3 minutes.
echo  Then open https://grassroots-mowing-co-au.onrender.com/
echo  and verify:
echo    1. SplashGate appears on first load (Indigenous design)
echo    2. Mount Isa Mines horizon visible at bottom
echo    3. Dot art pattern overlay on all Layout pages
echo    4. ENTER button dismisses gate and reveals app
echo    5. Refreshing does NOT show gate again (sessionStorage)
echo    6. /booking still loads directly (no gate on sub-routes)
echo ================================================================
pause
