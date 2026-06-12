@echo off
echo ================================================
echo  GrassRoots Dev Server - Clean Restart
echo ================================================
echo.

echo Checking for process on port 3000...
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr ":3000" ^| findstr LISTENING') DO (
    echo Killing PID %%P
    taskkill /F /PID %%P 2>nul
)

echo Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo Starting dev server...
cd /d C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE
start "GrassRoots Dev" cmd /k "npm run dev"

echo Done. Server starting in new window.
timeout /t 3 /nobreak >nul
