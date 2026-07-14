@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"

echo ============================================================
echo  GrassRoots — COMPLETE JOB Modal Portal Fix
echo ============================================================
echo.
echo  COMMIT: f112681
echo  fix: use createPortal for all modals -- escape Framer Motion
echo  transform (COMPLETE JOB now visible)
echo.
echo  ROOT CAUSE (confirmed via live browser inspection):
echo    All modals used "position: fixed inset-0" but a parent div
echo    had CSS transform: matrix(1,0,0,1,0,10) applied by Framer
echo    Motion during page-enter animation.
echo.
echo    CSS rules: position:fixed is anchored to its nearest
echo    TRANSFORMED ancestor, not the viewport. So the completion
echo    panel was rendering off-screen (card top: 771px, viewport
echo    height: 746px -- 25px below the visible area).
echo.
echo  FIX:
echo    All 5 modal mounts now use ReactDOM.createPortal(..., document.body)
echo    which renders directly into document.body (no transform ancestors).
echo    Fixed modals:
echo      - Completion panel (COMPLETE JOB)
echo      - Manual payment modal
echo      - Delete confirmation
echo      - Price override modal
echo      - Price override confirm
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
  echo  WHAT TO TEST AFTER DEPLOY:
  echo  1. Open any job with status "on_the_way"
  echo  2. Click COMPLETE JOB -- the form should appear VISIBLY
  echo     in the center of the screen
  echo  3. Confirm booked price is pre-filled ($110.00)
  echo  4. Optionally add add-ons, discount, notes
  echo  5. Click COMPLETE AND SEND INVOICE
  echo  6. Confirm job status becomes "completed"
  echo  7. Confirm invoice + SMS + email sent
  echo  8. Test Stripe payment link
  echo ============================================================
) else (
  echo.
  echo  Push FAILED. Check git credentials and try again.
)
pause
