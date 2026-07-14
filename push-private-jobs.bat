@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"

echo ============================================================
echo  GrassRoots — Admin-Only Private Jobs on Blocked Days
echo ============================================================
echo.
echo  COMMIT: 71c6ccb
echo  feat: admin-only private jobs on blocked schedule days
echo.
echo  WHAT WAS ADDED:
echo    1. src/data/privateJobStore.ts
echo       - New Firestore collection "private_jobs"
echo       - Auth-gated: unauthenticated users get nothing
echo       - usePrivateJobs() hook (polls every 60s, re-fetches on auth change)
echo       - 7 categories: Private Job, Personal, Project #156, Maintenance,
echo         Equipment, Internal Task, Other
echo.
echo    2. firestore.rules
echo       - private_jobs: allow read/write only if isAdmin()
echo       - Public users cannot access this collection at all
echo.
echo    3. src/pages/ScheduleCalendar.tsx
echo       - ADD PRIVATE JOB button in main toolbar (violet)
echo       - Lock icon button on each day in daily + weekly views
echo       - BLOCK TIME ^& ADD PRIVATE JOB in blockout modal footer
echo       - Private job form modal (title, date, time slot, address, etc)
echo       - Warning banner when adding a job to a blocked date
echo       - Daily view: PUBLIC STATUS banner + PRIVATE ENTRIES section
echo       - Weekly view: violet private job chips with Lock icon
echo       - Monthly view: private job count badge with Lock icon
echo       - Admin card: PRIVATE ADMIN ONLY header, violet border
echo.
echo  SECURITY:
echo    - ClientCalendar.tsx and Booking.tsx are UNCHANGED
echo    - Public availability is still derived from calendar_blocks ONLY
echo    - A blocked day stays blocked publicly even with private jobs added
echo    - Private jobs are invisible to customers, always
echo.
echo  COMMITS BEING PUSHED:
git log --oneline origin/grassroots-clean-recovery-base..HEAD
echo.

echo Pushing to grassroots-clean-recovery-base...
git push origin grassroots-clean-recovery-base

if %ERRORLEVEL% EQU 0 (
  echo.
  echo ============================================================
  echo  Push successful! Render is rebuilding.
  echo.
  echo  NEXT STEP — Deploy Firestore rules (run separately):
  echo    deploy-firestore-rules.bat
  echo.
  echo  WHAT TO TEST AFTER DEPLOY:
  echo  1. Go to Schedule page (admin)
  echo  2. Block a day (e.g. today) — Full Day blockout
  echo  3. Click BLOCK TIME ^& ADD PRIVATE JOB
  echo     - Private job modal opens pre-filled with same date
  echo     - WARNING: "This date is blocked from public bookings"
  echo  4. Fill in title "Test Private Job" and save
  echo  5. Admin schedule shows PRIVATE ENTRIES section with violet card
  echo  6. Monthly view shows "1 private" badge with lock icon
  echo  7. Open public booking page — date still shows as Unavailable
  echo  8. In DevTools Network: private_jobs collection is NOT queried
  echo  9. Log out — reload schedule page — private jobs not visible
  echo ============================================================
) else (
  echo.
  echo  Push FAILED. Check git credentials and try again.
)
pause
