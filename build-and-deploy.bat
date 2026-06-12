@echo off
echo ================================================
echo  GrassRoots Build + Deploy — Friend Test Launch
echo ================================================
echo.

cd /d C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE

echo [1/5] Stopping dev server on port 3000...
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr ":3000" ^| findstr LISTENING') DO (
    echo   Killing PID %%P
    taskkill /F /PID %%P 2>nul
)
timeout /t 2 /nobreak >nul

echo [2/5] Building...
call npm run build
IF ERRORLEVEL 1 (
    echo BUILD FAILED — fix errors before pushing.
    pause
    exit /b 1
)

echo [3/5] Scanning dist for secrets...
findstr /R "sk_test_ sk_live_ re_[A-Za-z0-9][A-Za-z0-9][A-Za-z0-9][A-Za-z0-9]" dist\assets\*.js >nul 2>&1
IF ERRORLEVEL 0 (
    echo WARNING: Possible secret key pattern found in dist — review before pushing!
) ELSE (
    echo   PASS: No secret patterns in dist/assets
)

echo [4/5] Git commit...
git add -A
git status
git commit -m "feat: friend-test launch — test banner, AutomationsManager MVP, safe Resend logging, restored App.tsx"
IF ERRORLEVEL 1 (
    echo Nothing to commit or commit failed.
)

echo [5/5] Git push...
git push
IF ERRORLEVEL 1 (
    echo PUSH FAILED — check git credentials.
    pause
    exit /b 1
)

echo.
echo ================================================
echo  DONE — check Render dashboard for deploy status
echo ================================================
pause
