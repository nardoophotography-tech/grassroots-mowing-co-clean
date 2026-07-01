Set-Location "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"
Write-Host "=== Pushing block-out commit to GitHub ===" -ForegroundColor Cyan
git push origin grassroots-clean-recovery-base
Write-Host ""
Write-Host "Done. Exit code: $LASTEXITCODE" -ForegroundColor Green
Read-Host "Press Enter to close"

