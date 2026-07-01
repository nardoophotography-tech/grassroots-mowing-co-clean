@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"
echo [SIDEBAR FIX] %date% %time% > sidebar_fix_log.txt 2>&1

echo === GIT ADD === >> sidebar_fix_log.txt
git add src/components/Navigation.tsx >> sidebar_fix_log.txt 2>&1

echo === GIT COMMIT === >> sidebar_fix_log.txt
git commit -m "fix: mobile sidebar touch bleed-through - prevent overlay from closing immediately on tap" >> sidebar_fix_log.txt 2>&1
set COMMIT_EXIT=%ERRORLEVEL%
echo COMMIT EXIT: %COMMIT_EXIT% >> sidebar_fix_log.txt

echo === GIT PUSH === >> sidebar_fix_log.txt
git push >> sidebar_fix_log.txt 2>&1
set PUSH_EXIT=%ERRORLEVEL%
echo PUSH EXIT: %PUSH_EXIT% >> sidebar_fix_log.txt

echo === DONE === >> sidebar_fix_log.txt
echo COMMIT: %COMMIT_EXIT% PUSH: %PUSH_EXIT% >> sidebar_fix_log.txt
echo [FINISHED] %date% %time% >> sidebar_fix_log.txt
echo Done. Check sidebar_fix_log.txt
pause
