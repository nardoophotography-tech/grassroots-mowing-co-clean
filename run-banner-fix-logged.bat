@echo off
cd /d C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE
echo START > build-log.txt
echo [1] Building... >> build-log.txt
call npm run build >> build-log.txt 2>&1
IF ERRORLEVEL 1 (
    echo BUILD_RESULT=FAIL >> build-log.txt
    echo BUILD FAILED >> build-log.txt
    exit /b 1
)
echo BUILD_RESULT=PASS >> build-log.txt

echo [2] Checking dist for banner text... >> build-log.txt
findstr "friend testing" dist\assets\*.js >> build-log.txt 2>&1
IF NOT ERRORLEVEL 1 (
    echo BANNER_SCAN=FAIL - banner text still in bundle >> build-log.txt
) ELSE (
    echo BANNER_SCAN=PASS - banner text NOT in bundle >> build-log.txt
)

echo [3] Git commit and push... >> build-log.txt
git add src/App.tsx >> build-log.txt 2>&1
git status >> build-log.txt 2>&1
git commit -m "fix: hide TEST VERSION banner by default — only show when VITE_LAUNCH_MODE=test" >> build-log.txt 2>&1
git push >> build-log.txt 2>&1
IF ERRORLEVEL 1 (
    echo PUSH_RESULT=FAIL >> build-log.txt
) ELSE (
    echo PUSH_RESULT=PASS >> build-log.txt
)

echo [4] Git log last 3 commits: >> build-log.txt
git log --oneline -3 >> build-log.txt 2>&1

echo DONE >> build-log.txt
