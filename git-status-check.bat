@echo off
cd /d C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE
echo ================================================
echo  GrassRoots Git Status
echo ================================================
echo.
echo [Branch]
git branch --show-current
echo.
echo [Remote]
git remote -v
echo.
echo [Recent commits]
git log --oneline -5
echo.
echo [Status]
git status --short
echo.
echo [Staged changes since last commit]
git diff --stat HEAD
echo.
pause
