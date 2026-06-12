@echo off
echo ================================================
echo  Build + Deploy: Resend domain fix
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

echo [3/4] Scanning dist for secrets...
findstr /R "sk_live_ re_[A-Za-z0-9][A-Za-z0-9][A-Za-z0-9][A-Za-z0-9][A-Za-z0-9][A-Za-z0-9]" dist\assets\*.js >nul 2>&1
IF NOT ERRORLEVEL 1 (
    echo WARNING: Possible secret key pattern in dist!
) ELSE (
    echo   PASS: No secret patterns in dist/assets
)

echo [4/4] Commit and push...
git add -A
git commit -m "fix: Resend domain admin@project156.com, honest email delivery status, no fake sent"
git push

echo.
echo ================================================
echo  Done — Render will auto-deploy.
echo ================================================
pause
