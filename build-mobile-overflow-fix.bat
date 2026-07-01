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
git add src/components/BrandCharacter.tsx src/components/AIBookingAssistant.tsx src/pages/LandingPage.tsx src/index.css
git commit -m "fix: mobile horizontal overflow — BrandCharacter label, AI chat width, heading scale, body overflow-x hidden"
git push origin grassroots-clean-recovery-base
echo.
echo === DONE ===
pause
