@echo off
echo ================================================
echo  Fix Dockerfile: server.js → server.cjs
echo ================================================
cd /d C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE

git add Dockerfile
git commit -m "fix: Dockerfile CMD server.js -> server.cjs (matches build output)"
git push

echo.
echo ================================================
echo  Done. Check Render dashboard to watch deploy.
echo  Render auto-deploys on push to this branch.
echo ================================================
pause
