@echo off
echo ================================================
echo  Build + Deploy: Payment reminder email content
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

echo [3/4] Commit and push...
git add -A
git commit -m "fix: customer reminder email content — proper greeting, invoice#, amount, payment link, Project 156 signature"
git push

echo [4/4] Done — Render will auto-deploy.
echo.
echo What the customer now receives:
echo   Subject: Friendly Payment Reminder — Invoice [INV-XXX]
echo   Body:    Hi [Name], invoice number, amount, payment link, GrassRoots signature
echo.
echo What YOU (admin) now receive:
echo   Subject: [ADMIN] Reminder dispatched to [Client Name]
echo   Body:    Internal confirmation with client email + invoice details
echo ================================================
pause
