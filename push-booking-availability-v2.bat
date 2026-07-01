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
git add src/types.ts
git add src/hooks/useFirebase.ts
git add src/components/Calendar/ClientCalendar.tsx
git add src/components/BookingSettingsPanel.tsx
git add src/pages/Booking.tsx
git add src/pages/ScheduleCalendar.tsx
git add src/pages/Dashboards.tsx
git add src/constants.ts
git commit -m "feat: booking availability control — intake gate, first service date, working days, run limits, admin panel (bookingSettings/main)"
git push origin grassroots-clean-recovery-base
echo.
echo Done. Go to Render ^> grassroots-mowing-co-au ^> Manual Deploy.
pause
