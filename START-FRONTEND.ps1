Clear-Host
Write-Host "`n=== Starting GrassRoots Frontend ===" -ForegroundColor Green

Set-Location "C:\Users\nardo\Desktop\mowing\grassroots-mowing-conew\client"

foreach ($port in @(5173,5174)) {
  $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
  if ($connections) {
    $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid in $pids) {
      Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
  }
}

Write-Host "`nOpen: http://localhost:5173/" -ForegroundColor Yellow
npm run dev -- --port 5173 --host 127.0.0.1
