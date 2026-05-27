Clear-Host

Write-Host "`n=== GrassRoots Frontend Build Check ===" -ForegroundColor Green

Set-Location "C:\Users\nardo\Desktop\mowing\grassroots-mowing-conew\client"

npm run build

if ($LASTEXITCODE -ne 0) {
  Write-Host "`nFrontend build failed. Send the red error text to ChatGPT." -ForegroundColor Red
  exit 1
}

Write-Host "`nFrontend build passed." -ForegroundColor Green
