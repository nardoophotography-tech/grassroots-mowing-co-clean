@echo off
echo ================================================
echo  Build + Deploy: Enhanced /api/automations/status
echo  - resendApiKeyPresent (not just resendConnected)
echo  - resendApiKeyPrefix (safe: first 3 chars)
echo  - fromEmailSource: env vs fallback
echo  - renderEnvDetected: Render runtime flag
echo  - Startup log: RENDER env flag added
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
git commit -m "fix: enhanced /api/automations/status diagnostics — resendApiKeyPresent, fromEmailSource, renderEnvDetected"
git push

echo [4/4] Done.
echo.
echo After Render deploys, check:
echo   /api/automations/status
echo Expected:
echo   resendConnected: true
echo   resendApiKeyPresent: true
echo   resendApiKeyPrefix: re_
echo   fromEmail: admin@project156.com
echo   fromEmailSource: env
echo   renderEnvDetected: true
echo.
echo If renderEnvDetected is false = Render env not loaded yet.
echo If fromEmailSource is fallback = RESEND_FROM_EMAIL var missing.
echo If resendApiKeyPresent is false = RESEND_API_KEY var missing.
echo ================================================
pause
