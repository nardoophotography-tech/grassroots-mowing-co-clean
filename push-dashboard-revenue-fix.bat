@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"
echo Building...
call npm run build
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo BUILD FAILED — fix errors above before pushing.
  pause
  exit /b 1
)
echo Build OK. Committing...
git add src/pages/Dashboards.tsx
git commit -m "fix: Monthly Revenue ignores orphaned test payment records — jobId must match a real job"
git push origin grassroots-clean-recovery-base
echo.
echo Done. Go to Render ^> grassroots-mowing-co-au ^> Manual Deploy.
pause
