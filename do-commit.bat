@echo off
cd /d C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE
git add src/App.tsx
git commit -m "revert: restore approved LandingPage, remove unapproved SplashGate redesign"
git push origin grassroots-clean-recovery-base
echo.
echo === DONE ===
pause
