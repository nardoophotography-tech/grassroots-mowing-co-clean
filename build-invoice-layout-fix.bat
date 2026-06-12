@echo off
echo ================================================
echo  Build + Deploy: Invoice Layout Fix
echo  - Reduced cell padding px-8 → px-4
echo  - Action buttons: icon-only with title tooltips
echo  - gap-3 → gap-0.5 between action buttons
echo  - min-w-[700px] table, no horizontal scroll
echo  - Date column hidden on small screens
echo  - All actions still functional (Remind, Copy Link,
echo    Mark Paid, Audit, Delete)
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
git commit -m "fix: invoice table layout — icon-only actions, compact padding, no horizontal overflow"
git push

echo.
echo ================================================
echo  Acceptance test after Render deploys (~2 min):
echo.
echo  1. Open live URL /invoices on 1366px laptop screen
echo  2. No horizontal scrollbar — table fits page width
echo  3. Hover action icons — title tooltip appears
echo  4. Click Remind icon (paper-plane) — reminder fires
echo  5. Click Copy icon — toast "Payment link copied"
echo  6. Click Check icon — mark paid confirmation
echo  7. Click Clipboard icon — navigates to job audit
echo  8. Click Trash icon — delete confirmation dialog
echo  9. Status badges (Sent / Paid) still visible
echo  10. TEST VERSION banner still visible
echo ================================================
pause
