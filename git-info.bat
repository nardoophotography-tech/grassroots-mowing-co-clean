@echo off
cd /d C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE
(
  echo === Branch ===
  git branch --show-current
  echo.
  echo === Remote ===
  git remote -v
  echo.
  echo === Recent commits ===
  git log --oneline -5
  echo.
  echo === Status ===
  git status --short
  echo.
  echo === Unpushed commits ===
  git log @{u}..HEAD --oneline 2>&1
) > "%~dp0git-info-output.txt" 2>&1
echo Done. Output written to git-info-output.txt
timeout /t 2 /nobreak >nul
