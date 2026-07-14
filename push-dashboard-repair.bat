@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"

echo ============================================================
echo  GrassRoots — Dashboard Repair Push
echo ============================================================
echo.
echo  COMMITS BEING PUSHED:
echo.
git log --oneline origin/grassroots-clean-recovery-base..HEAD
echo.
echo  WHAT WAS REPAIRED:
echo.
echo  Dashboards.tsx — removed corrupted duplicate JSX fragment
echo    Lines 1929-1935 were a stale cat-append artifact:
echo      me="bg-deep-red text-white hover:bg-deep-red/90..."
echo      ^>
echo        Return to Landing Page
echo      ^</Button^>
echo    ...
echo    ^};
echo    This caused: Expected ";" but found "to" at line 1931
echo    Dashboard component now closes cleanly at line 1928 (^};)
echo.
echo  Booking.tsx — removed extra closing brace at line 641
echo    Duplicate ^}; caused: Unexpected "^}" at line 641
echo.
echo  types.ts — removed trailing garbage fragment
echo    ckedSlot[]; and extra ^} after BookingSettings close
echo ============================================================
echo.

echo Pushing to grassroots-clean-recovery-base...
git push origin grassroots-clean-recovery-base

if %ERRORLEVEL% EQU 0 (
  echo.
  echo ============================================================
  echo  Push successful! Render is now rebuilding.
  echo.
  echo  VERIFY ON RENDER:
  echo  1. Go to https://render.com/dashboard
  echo  2. Watch for a new deploy triggered by this push
  echo  3. Build should pass — no more JSX syntax errors
  echo  4. Once live, test:
  echo     - /booking  (should start at Your Details, no step 1)
  echo     - Admin ^> Take Booking (price should auto-fill)
  echo     - Open a job ^> Complete (booked price pre-filled)
  echo ============================================================
) else (
  echo.
  echo  Push FAILED. Check your git credentials and try again.
)
pause
