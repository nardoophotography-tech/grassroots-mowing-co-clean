@echo off
echo ================================================================
echo  BUILD — GrassRoots Final Launch (All Fixes)
echo.
echo  Includes ALL changes from this session:
echo.
echo  [nav-fix] Navigation sidebar — admin/staff no longer see
echo    "Client Menu" regardless of clientType
echo.
echo  [admin-role-fix] AuthContext — admin email detection in
echo    docSnap.exists branch, effectiveProfile override,
echo    new-admin race condition fix
echo.
echo  [invoice-layout] Icon-only action buttons, reduced padding,
echo    enhanced payment badges (Stripe / Cash / Manual)
echo.
echo  [security] Stripe webhook unsigned rejection in production,
echo    startup diagnostics, APP_URL for success_url
echo.
echo  [types] Invoice.status includes 'pending-cash'
echo  [app] TEST VERSION banner controlled by VITE_LAUNCH_MODE
echo ================================================================
cd /d C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE

echo [1/5] Stopping any dev server on port 3000...
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr ":3000" ^| findstr LISTENING') DO (
    taskkill /F /PID %%P 2>nul
)
timeout /t 2 /nobreak >nul

echo [2/5] Building...
call npm run build
IF ERRORLEVEL 1 (
    echo.
    echo BUILD FAILED — fix TypeScript errors above then re-run.
    pause
    exit /b 1
)

echo [3/5] Secret scan...
findstr /R "sk_live_ re_[A-Za-z0-9][A-Za-z0-9][A-Za-z0-9][A-Za-z0-9][A-Za-z0-9]" dist\assets\*.js >nul 2>&1
IF NOT ERRORLEVEL 1 (
    echo.
    echo *** WARNING: Possible secret pattern in dist/assets ***
    echo *** Review before pushing ***
    pause
) ELSE (
    echo   PASS — no secret patterns in dist/assets
)

echo [4/5] Commit and push all fixes...
git add -A
git commit -m "fix: admin sidebar role guard, invoice layout, auth role detection, webhook security, payment badges, launch mode banner"
git push
IF ERRORLEVEL 1 (
    echo.
    echo PUSH FAILED — check git remote and branch.
    pause
    exit /b 1
)

echo [5/5] Done.
echo.
echo ================================================================
echo  Render will redeploy automatically (2-3 min).
echo.
echo  ACCEPTANCE TEST after deploy:
echo    1. Sign in as nardoophotography@gmail.com
echo    2. Sidebar shows: Operations + Admin Centre ONLY (no Client Menu)
echo    3. /invoices — no horizontal scroll, icon buttons fit cleanly
echo    4. /admin — AdminPortal loads
echo    5. /admin/automations — AutomationsManager loads
echo    6. TEST VERSION banner visible (until VITE_LAUNCH_MODE=live added)
echo.
echo  Render env vars still needed for Stripe live payments:
echo    STRIPE_SECRET_KEY       = sk_live_... (paste in Render)
echo    VITE_STRIPE_PUBLISHABLE_KEY = pk_live_... (paste in Render)
echo    STRIPE_WEBHOOK_SECRET   = whsec_... (from Stripe dashboard)
echo    APP_URL                 = https://grassroots-mowing-co-au.onrender.com
echo.
echo  To remove TEST banner: VITE_LAUNCH_MODE=live in Render + redeploy
echo ================================================================
pause
