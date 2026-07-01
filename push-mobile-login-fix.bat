@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"
echo.
echo ============================================================
echo  GrassRoots — Mobile Portal Login Fix
echo  Files: Login.tsx, Navigation.tsx, Dashboards.tsx, App.tsx
echo ============================================================
echo.
echo [1/3] Building...
call npm run build
if %ERRORLEVEL% NEQ 0 (
  echo BUILD FAILED — fix errors above before pushing.
  pause
  exit /b 1
)
echo.
echo [2/3] Staging changed source files only...
git add src/pages/Login.tsx src/components/Navigation.tsx src/pages/Dashboards.tsx src/App.tsx
echo.
echo [3/3] Committing and pushing...
git commit -m "fix: mobile portal login — selector screen, admin guard, loading race fix

- Login.tsx: add portal selector at /login (no intendedRole) with 5 pathways:
  Admin Access, Returning Client, Asset Management, Recurring Client, Guest Booking
- Navigation.tsx: ONE OFF CLIENTS button routes to /login (portal selector).
  Fix intendedRole=returning/asset_management → intendedRole=client (valid UserRole).
  isOneOff guard is loading-aware to prevent guest flash for admin on slow connections.
- Dashboards.tsx: ADMIN_EMAILS email-based guard fires first — admin email users
  always reach AdminDashboard even with stale Firestore profile (clientType=one_off).
- App.tsx: Layout passes loading prop to GlobalHeader."
git push origin grassroots-clean-recovery-base
if %ERRORLEVEL% NEQ 0 (
  echo PUSH FAILED — check git credentials and remote.
  pause
  exit /b 1
)
echo.
echo ============================================================
echo  DONE. Go to Render ^> grassroots-mowing-co-au ^> Manual Deploy
echo ============================================================
pause
