@echo off
echo ================================================================
echo  BUILD — GrassRoots Production Launch
echo  Changes in this build:
echo.
echo  [admin-role-fix]
echo   - AuthContext: upgrade role:'client' -> 'admin' for ADMIN_EMAILS
echo   - effectiveProfile: force admin for ADMIN_EMAILS (belt+suspenders)
echo   - New-admin race condition fixed (setProfile immediately after setDoc)
echo.
echo  [invoice-layout-fix]
echo   - Table padding px-8 -> px-4 (no horizontal scroll at 1366px)
echo   - Action buttons: icon-only with title tooltips
echo   - Enhanced payment badges: Stripe / Manual / Cash / Overdue
echo.
echo  [security]
echo   - Stripe webhook: unsigned requests REJECTED in production
echo   - Startup logs: STRIPE mode (LIVE/TEST), WEBHOOK_SECRET present,
echo     APP_URL set
echo   - TEST banner: controlled by VITE_LAUNCH_MODE=live in Render
echo.
echo  [stripe-fixes]
echo   - complete-job success_url: uses APP_URL (not just VITE_APP_URL)
echo   - types.ts: Invoice.status includes 'pending-cash'
echo ================================================================
cd /d C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE

echo [1/5] Stopping dev server on port 3000...
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

echo [3/5] Secret scan (dist/assets)...
findstr /R "sk_live_ re_[A-Za-z0-9][A-Za-z0-9][A-Za-z0-9][A-Za-z0-9][A-Za-z0-9]" dist\assets\*.js >nul 2>&1
IF NOT ERRORLEVEL 1 (
    echo.
    echo *** WARNING: Possible secret pattern in dist/assets ***
    echo *** Review before pushing ***
    pause
) ELSE (
    echo   PASS — no secret patterns in dist/assets
)

echo [4/5] Commit and push...
git add -A
git commit -m "production: admin role fix, invoice layout, webhook security, payment badges, VITE_LAUNCH_MODE banner"
git push

echo [5/5] Done.
echo.
echo ================================================================
echo  RENDER — environment variables you MUST set before going live:
echo.
echo  Already set (confirm):
echo    RESEND_API_KEY          = re_... (rotate if was exposed)
echo    RESEND_FROM_EMAIL       = admin@project156.com
echo    FIREBASE_SERVICE_ACCOUNT = (JSON)
echo    VITE_FIREBASE_*         = (all Firebase config vars)
echo.
echo  Must add for Stripe live payments:
echo    STRIPE_SECRET_KEY       = sk_live_... (paste in Render, do not chat)
echo    VITE_STRIPE_PUBLISHABLE_KEY = pk_live_... (paste in Render)
echo    STRIPE_WEBHOOK_SECRET   = whsec_... (from Stripe webhook dashboard)
echo    APP_URL                 = https://grassroots-mowing-co-au.onrender.com
echo.
echo  To remove TEST VERSION banner after live checks pass:
echo    VITE_LAUNCH_MODE        = live
echo.
echo  Stripe webhook endpoint to register in Stripe dashboard:
echo    https://grassroots-mowing-co-au.onrender.com/api/stripe-webhook
echo  Events to enable:
echo    checkout.session.completed
echo    payment_intent.succeeded
echo.
echo ================================================================
echo  ROTATE EXPOSED CREDENTIALS before full public launch:
echo    1. Resend — go to resend.com -> API Keys -> regenerate
echo    2. Twilio Auth Token — go to console.twilio.com -> rotate
echo    3. Stripe sk_test_ key — if exposed, rotate in Stripe dashboard
echo    4. Google Maps API key — add HTTP referrer restrictions
echo ================================================================
echo.
echo  ACCEPTANCE TEST after Render deploys (2-3 min):
echo    1. https://grassroots-mowing-co-au.onrender.com  — homepage loads
echo    2. /booking — booking form works (no login)
echo    3. Sign in as nardoophotography@gmail.com -> /dashboard (admin)
echo    4. /invoices — no horizontal scroll, all icons visible
echo    5. /admin — AdminPortal loads
echo    6. /admin/automations — AutomationsManager loads, resendConnected:true
echo    7. Send REMIND on a test invoice — email arrives in Gmail
echo    8. Open /pay/[invoiceId] — Stripe checkout opens
echo    9. Pay with Stripe test card 4242 4242 4242 4242
echo   10. Invoice status -> 'paid' (Stripe / Manual badge)
echo   11. Admin receives payment confirmation email
echo   12. TEST VERSION banner still visible (until VITE_LAUNCH_MODE=live)
echo ================================================================
pause
