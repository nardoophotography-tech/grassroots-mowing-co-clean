@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"
echo [MOBILE FIX BUILD STARTED] %date% %time% > mobile_fix_log.txt 2>&1

echo. >> mobile_fix_log.txt
echo === RUNNING npm run build === >> mobile_fix_log.txt
call npm run build >> mobile_fix_log.txt 2>&1
set BUILD_EXIT=%ERRORLEVEL%
echo BUILD EXIT CODE: %BUILD_EXIT% >> mobile_fix_log.txt

echo. >> mobile_fix_log.txt
echo === GIT STATUS === >> mobile_fix_log.txt
git status >> mobile_fix_log.txt 2>&1

echo. >> mobile_fix_log.txt
echo === GIT ADD === >> mobile_fix_log.txt
git add src/App.tsx src/pages/Dashboards.tsx src/pages/JobDetail.tsx src/pages/QuoteApproval.tsx src/pages/InvoicePayment.tsx >> mobile_fix_log.txt 2>&1

echo. >> mobile_fix_log.txt
echo === GIT COMMIT === >> mobile_fix_log.txt
git commit -m "fix: mobile responsiveness - fix grid-cols-4 pipeline kanban, collapse stat grids to 1-col on mobile, reduce layout padding at 360px, stack invoice/quote/job detail grids on mobile" >> mobile_fix_log.txt 2>&1
set COMMIT_EXIT=%ERRORLEVEL%
echo COMMIT EXIT CODE: %COMMIT_EXIT% >> mobile_fix_log.txt

echo. >> mobile_fix_log.txt
echo === GIT PUSH === >> mobile_fix_log.txt
git push >> mobile_fix_log.txt 2>&1
set PUSH_EXIT=%ERRORLEVEL%
echo PUSH EXIT CODE: %PUSH_EXIT% >> mobile_fix_log.txt

echo. >> mobile_fix_log.txt
echo === DONE === >> mobile_fix_log.txt
echo BUILD: %BUILD_EXIT% COMMIT: %COMMIT_EXIT% PUSH: %PUSH_EXIT% >> mobile_fix_log.txt
echo [FINISHED] %date% %time% >> mobile_fix_log.txt

echo Mobile fix complete. Check mobile_fix_log.txt
pause
