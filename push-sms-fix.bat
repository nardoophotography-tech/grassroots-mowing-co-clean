@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"

echo ============================================================
echo  GrassRoots — SMS Fix Push
echo  Files: server.ts (admin SMS for quote-sent), test-sms.bat
echo ============================================================
echo.

echo Staging files...
git add server.ts
git add test-sms.bat

echo.
echo Files staged:
git diff --cached --name-only
echo.

git commit -m "fix: add admin SMS notification for quote-sent stage + SMS test script"

git push origin grassroots-clean-recovery-base

echo.
echo ============================================================
echo  Push complete. Render will redeploy automatically.
echo.
echo  NEXT STEPS:
echo  1. Wait ~2 minutes for Render to deploy
echo  2. Double-click test-sms.bat to run 3-loop SMS test
echo  3. Check your phone (+61404231448) for 3 messages
echo  4. Check the JSON output in the console for ok:true
echo ============================================================
pause
