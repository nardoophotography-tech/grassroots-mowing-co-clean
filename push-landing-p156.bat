@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"

:: Check logo exists before building
if not exist "public\project156.png" (
  echo.
  echo ERROR: public\project156.png not found.
  echo Please place the Project #156 logo at:
  echo   C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE\public\project156.png
  echo Then run this bat again.
  pause
  exit /b 1
)

echo Building...
call npm run build
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo BUILD FAILED — fix errors above before pushing.
  pause
  exit /b 1
)
echo Build OK. Committing...
git add src/pages/LandingPage.tsx
git add public/project156.png
git commit -m "feat: Project #156 card — logo, updated wording (initial self-funded project), triage/web app mention, vision section"
git push origin grassroots-clean-recovery-base
echo.
echo Done. Go to Render ^> grassroots-mowing-co-au ^> Manual Deploy.
pause
