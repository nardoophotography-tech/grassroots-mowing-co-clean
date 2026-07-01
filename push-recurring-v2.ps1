$GIT_DIR = "C:\Users\nardo\Desktop\mowing\grassroots-mowing-conew\.git\worktrees\grassroots-restore-test"
$WORK_TREE = "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"

$env:GIT_DIR = $GIT_DIR
$env:GIT_WORK_TREE = $WORK_TREE
$env:GIT_COMMON_DIR = "C:\Users\nardo\Desktop\mowing\grassroots-mowing-conew\.git"

Set-Location $WORK_TREE

Write-Host "=== Git dir: $GIT_DIR" -ForegroundColor Cyan
Write-Host "=== Work tree: $WORK_TREE" -ForegroundColor Cyan
Write-Host ""

Write-Host "=== Git status ===" -ForegroundColor Cyan
git status --short

Write-Host ""
Write-Host "=== Removing stale lock files ===" -ForegroundColor Cyan
$lockFiles = @(
    "$GIT_DIR\HEAD.lock",
    "$GIT_DIR\index.lock"
)
foreach ($f in $lockFiles) {
    if (Test-Path $f) {
        Remove-Item $f -Force
        Write-Host "  Removed: $f" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Staging files ===" -ForegroundColor Cyan
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
if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS — push complete." -ForegroundColor Green
} else {
    Write-Host "FAILED — exit code $LASTEXITCODE" -ForegroundColor Red
}

# Clean up env vars
Remove-Item Env:GIT_DIR -ErrorAction SilentlyContinue
Remove-Item Env:GIT_WORK_TREE -ErrorAction SilentlyContinue
Remove-Item Env:GIT_COMMON_DIR -ErrorAction SilentlyContinue

Read-Host "Press Enter to close"
