Set-Location "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"

Write-Host "=== Git status ===" -ForegroundColor Cyan
git status --short

Write-Host ""
Write-Host "=== Staging 3 changed files ===" -ForegroundColor Cyan
git add src/data/blockoutStore.ts
git add src/pages/ScheduleCalendar.tsx
git add src/components/Calendar/ClientCalendar.tsx

Write-Host ""
Write-Host "=== Diff summary ===" -ForegroundColor Cyan
git diff --cached --stat

Write-Host ""
Write-Host "=== Committing ===" -ForegroundColor Cyan
git commit -m "Add recurring weekly block-out rules"

Write-Host ""
Write-Host "=== Pushing ===" -ForegroundColor Cyan
git push origin grassroots-clean-recovery-base

Write-Host ""
Write-Host "Done. Exit code: $LASTEXITCODE" -ForegroundColor Green
Read-Host "Press Enter to close"
