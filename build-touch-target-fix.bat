@echo off
cd /d C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE
echo === BUILD ===
call npm run build
if errorlevel 1 (
  echo BUILD FAILED
  pause
  exit /b 1
)
echo.
echo === BUILD PASS — committing ===
git add src/pages/LandingPage.tsx
git commit -m "fix: bump landing nav buttons to h-11 (44px) for minimum touch target on all screen sizes"
git push origin grassroots-clean-recovery-base
echo.
echo === DONE ===
pause
