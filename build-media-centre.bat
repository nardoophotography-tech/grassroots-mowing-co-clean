@echo off
cd /d C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE
echo === BUILD ===
call npm run build
if errorlevel 1 (
  echo BUILD FAILED
  pause
  exit /b 1
)
echo.
echo === BUILD PASS — committing ===
git add src/pages/admin/MediaCentre.tsx src/App.tsx src/components/Navigation.tsx
git commit -m "feat: add Media Control Centre page — /admin/media, sidebar link, all 7 sections"
git push origin grassroots-clean-recovery-base
echo.
echo === DONE — check Render for deploy ===
pause
