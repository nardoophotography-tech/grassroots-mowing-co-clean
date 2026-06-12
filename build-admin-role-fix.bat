@echo off
echo ================================================
echo  Build + Deploy: Admin Role Fix
echo  - AuthContext: upgrade role:'client' to 'admin'
echo    for ADMIN_EMAILS users when doc already exists
echo  - effectiveProfile: always forces role:'admin'
echo    for ADMIN_EMAILS as belt-and-suspenders
echo  - New admin: setProfile immediately after setDoc
echo    so route guard never sees profile=null
echo ================================================
cd /d C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE

echo [1/4] Stopping dev server on port 3000...
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr ":3000" ^| findstr LISTENING') DO (
    taskkill /F /PID %%P 2>nul
)
timeout /t 2 /nobreak >nul

echo [2/4] Building...
call npm run build
IF ERRORLEVEL 1 (
    echo BUILD FAILED.
    pause
    exit /b 1
)

echo [3/4] Scanning dist for exposed secrets...
findstr /R "sk_live_ re_[A-Za-z0-9][A-Za-z0-9][A-Za-z0-9][A-Za-z0-9][A-Za-z0-9]" dist\assets\*.js >nul 2>&1
IF NOT ERRORLEVEL 1 (
    echo WARNING: Possible secret pattern in dist/assets. Check before pushing.
    pause
) ELSE (
    echo   PASS: No secret patterns in dist/assets
)

echo [4/4] Commit and push...
git add -A
git commit -m "fix: admin role detection — upgrade existing Firestore doc role for ADMIN_EMAILS on login"
git push

echo.
echo ================================================
echo  Acceptance test after Render deploys (~2 min):
echo.
echo  AS ADMIN (nardoophotography@gmail.com):
echo  1. Open live URL in incognito window
echo  2. Sign in with Google (nardoophotography@gmail.com)
echo  3. Dashboard must open — no "Portal Access Required"
echo  4. Sidebar must show ADMIN menu (not CLIENT menu)
echo  5. Navigate to /admin — must load AdminPortal
echo  6. Navigate to /invoices — must load InvoiceList
echo  7. Navigate to /admin/automations — must load
echo  8. TEST VERSION banner must still be visible
echo.
echo  AS FRIEND (incognito, different Google account):
echo  9. Sign in — dashboard opens as CLIENT view
echo  10. /admin redirects to /dashboard (no admin access)
echo  11. /invoices redirects to /dashboard
echo.
echo  API check:
echo  12. /api/automations/status — resendConnected: true
echo ================================================
pause
