@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"
echo.
echo === Committing: fix mobile login page blank on phones ===
git status src/pages/Login.tsx
git add src/pages/Login.tsx
git commit -m "fix: login page blank on mobile phones"
git push origin grassroots-clean-recovery-base
echo.
echo === Done ===
pause
