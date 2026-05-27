Clear-Host

Write-Host "`n=== GrassRoots Frontend Fresh Port 5174 ===" -ForegroundColor Green

Set-Location "C:\Users\nardo\Desktop\mowing\grassroots-mowing-conew\client"

Write-Host "`nStarting frontend on fresh port:" -ForegroundColor Cyan
Write-Host "http://localhost:5174/" -ForegroundColor Yellow

npm run dev -- --port 5174 --host 127.0.0.1
