@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"
call npm run build
if %ERRORLEVEL% NEQ 0 (
  echo BUILD FAILED — fix errors above before pushing.
  pause
  exit /b 1
)
git add src/components/Calendar/ClientCalendar.tsx src/data/blockoutStore.ts
git commit -m "fix: booking calendar — full_day blockouts always disable public booking, 6-job daily limit, 60s polling"
git push origin grassroots-clean-recovery-base
echo.
echo Done. Go to Render and click Manual Deploy on grassroots-mowing-co-au.
pause
