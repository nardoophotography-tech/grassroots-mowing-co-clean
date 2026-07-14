@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"

echo ============================================================
echo  GrassRoots — Complete Job Button Fix
echo ============================================================
echo.
echo  COMMIT: ad3f132
echo  Fix Complete Job button and completion modal
echo.
echo  ROOT CAUSE:
echo    renderCompletionPanel() was defined (line 572) but never
echo    called in the JSX return. Clicking COMPLETE JOB set
echo    showCompletionPanel=true but nothing was mounted to render.
echo.
echo  FIX APPLIED:
echo    Added before the delete confirmation modal:
echo      {showCompletionPanel ^&^& renderCompletionPanel()}
echo      {showManualPayment ^&^& renderManualPaymentModal()}
echo.
echo  WHAT TO TEST AFTER DEPLOY:
echo    1. Open any job with status on_the_way (or in-progress)
echo    2. Click COMPLETE JOB button
echo    3. Completion form should slide open:
echo       - Booked price pre-filled
echo       - Add-ons, discount, notes fields
echo       - COMPLETE AND SEND INVOICE button
echo    4. Complete the job -- invoice should be sent
echo ============================================================
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
  echo  Watch https://render.com/dashboard for the new deploy.
  echo ============================================================
) else (
  echo.
  echo  Push FAILED. Check git credentials and try again.
)
pause
