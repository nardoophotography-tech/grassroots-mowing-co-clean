@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"

echo ============================================================
echo  GrassRoots — Schedule Save + Worker Access Fix
echo  Files: firestore.rules, AuthContext.tsx, useFirebase.ts,
echo         ScheduleCalendar.tsx
echo ============================================================
echo.

echo Building...
call npm run build
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo BUILD FAILED — fix errors above before pushing.
  pause
  exit /b 1
)
echo Build OK.
echo.

echo Staging changed files...
git add firestore.rules
git add src/contexts/AuthContext.tsx
git add src/hooks/useFirebase.ts
git add src/pages/ScheduleCalendar.tsx

echo.
echo Files staged:
git diff --cached --name-only
echo.

git commit -m "fix: schedule settings save (Firestore rules + REST write) + worker auth (signUp/logout wired, BookingSettingsPanel admin-gated)"

git push origin grassroots-clean-recovery-base

echo.
echo ============================================================
echo Done. Go to Render ^> grassroots-mowing-co-au ^> Manual Deploy.
echo.
echo After deploy, test:
echo   1. Admin: open /schedule ^> change a date/working day ^> Save Settings
echo      Refresh page — settings must persist.
echo   2. Worker: log in via /login?portal=staff ^> navigate to /tech and /jobs
echo      Both pages must load (no redirect to /login).
echo   3. Worker navigating to /schedule must NOT see BookingSettingsPanel.
echo   4. Logout button must work for all user types.
echo ============================================================
pause
