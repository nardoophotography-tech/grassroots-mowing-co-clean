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
git add src/components/Navigation.tsx
git commit -m "fix: increase header height and button tap targets for mobile/tablet visibility"
git push origin grassroots-clean-recovery-base
echo.
echo === DONE ===
pause
