@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"
echo [BUILD STARTED] %date% %time% > build_log.txt 2>&1

echo. >> build_log.txt
echo === RUNNING npm run build === >> build_log.txt
call npm run build >> build_log.txt 2>&1
set BUILD_EXIT=%ERRORLEVEL%
echo BUILD EXIT CODE: %BUILD_EXIT% >> build_log.txt

echo. >> build_log.txt
echo === GIT STATUS === >> build_log.txt
git status >> build_log.txt 2>&1

echo. >> build_log.txt
echo === GIT ADD === >> build_log.txt
git add src/pages/JobDetail.tsx src/pages/QuoteApproval.tsx src/services/pdfGenerator.ts src/components/Calendar/DailyCalendar.tsx src/hooks/useFirebase.ts src/pages/TechnicianDashboard.tsx >> build_log.txt 2>&1

echo. >> build_log.txt
echo === GIT COMMIT === >> build_log.txt
git commit -m "fix: guard job.addOns and pricingSnapshot.addOns against undefined in older Firestore documents - fixes JobDetail crash preventing Send Quote button from rendering" >> build_log.txt 2>&1
set COMMIT_EXIT=%ERRORLEVEL%
echo COMMIT EXIT CODE: %COMMIT_EXIT% >> build_log.txt

echo. >> build_log.txt
echo === GIT PUSH === >> build_log.txt
git push >> build_log.txt 2>&1
set PUSH_EXIT=%ERRORLEVEL%
echo PUSH EXIT CODE: %PUSH_EXIT% >> build_log.txt

echo. >> build_log.txt
echo === DONE === >> build_log.txt
echo BUILD: %BUILD_EXIT% COMMIT: %COMMIT_EXIT% PUSH: %PUSH_EXIT% >> build_log.txt
echo [FINISHED] %date% %time% >> build_log.txt

echo Build complete. Check build_log.txt for results.
pause
