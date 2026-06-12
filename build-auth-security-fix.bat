@echo off
echo ================================================
echo  Build + Deploy: Auth Security Fix
echo  - Anonymous users blocked from portal on Render
echo  - RoleGuard hooks violation fixed
echo  - /dashboard + /settings exclude anonymous users
echo  - Booking.tsx: removed broken signInAnonymously
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
git commit -m "security: block anonymous guest auto-login on production — fix RoleGuard hooks violation"
git push

echo.
echo ================================================
echo  Acceptance test after Render deploys:
echo  1. Open live URL in private/incognito window
echo  2. It must NOT auto-login as Guest User
echo  3. /dashboard must redirect to /login
echo  4. /admin must redirect to /login
echo  5. /invoices must redirect to /login
echo  6. /booking (public) must still work
echo  7. localhost ?localAdmin=true still works locally
echo ================================================
pause
