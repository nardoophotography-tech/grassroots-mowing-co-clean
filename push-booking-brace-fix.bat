@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"
echo Pushing fix: duplicate closing brace in Booking.tsx + types.ts trailing garbage...
echo.
git log --oneline -3
echo.
git push origin grassroots-clean-recovery-base
echo.
echo Done. Render will redeploy.
pause
