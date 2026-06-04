$ErrorActionPreference = "Stop"

$SERVICE_NAME = "cherry-core"
$REGION = "australia-southeast1"
$LIVE_URL = "https://cherry-core-1004272046304.australia-southeast1.run.app"
$REPORT = "CHERRY_DEPLOY_REPORT.txt"

Remove-Item $REPORT -Force -ErrorAction SilentlyContinue

function Add-Report($text) {
  Add-Content -Path $REPORT -Value $text
}

Add-Report "CHERRY DEPLOY REPORT"
Add-Report "Generated: $(Get-Date)"
Add-Report ""

Write-Host "`n=== CHERRY WINDOWS DEPLOY HELPER ===" -ForegroundColor Cyan

Write-Host "`n[1] Checking .env..." -ForegroundColor Yellow

if (!(Test-Path ".env")) {
  Write-Host "ERROR: .env file missing." -ForegroundColor Red
  Add-Report "ERROR: .env file missing."
  notepad $REPORT
  exit 1
}

$envLines = Get-Content ".env"

$geminiLine = $envLines | Where-Object { $_ -match "^\s*GEMINI_API_KEY\s*=" } | Select-Object -First 1
$testModeLine = $envLines | Where-Object { $_ -match "^\s*CHERRY_TEST_MODE\s*=" } | Select-Object -First 1
$quotaLine = $envLines | Where-Object { $_ -match "^\s*CHERRY_FORCE_QUOTA_EXHAUSTED\s*=" } | Select-Object -First 1

$GEMINI_API_KEY = ($geminiLine -replace "^\s*GEMINI_API_KEY\s*=\s*", "").Trim().Trim('"').Trim("'")
$CHERRY_TEST_MODE = if ($testModeLine) { ($testModeLine -replace "^\s*CHERRY_TEST_MODE\s*=\s*", "").Trim() } else { "false" }
$CHERRY_FORCE_QUOTA_EXHAUSTED = if ($quotaLine) { ($quotaLine -replace "^\s*CHERRY_FORCE_QUOTA_EXHAUSTED\s*=\s*", "").Trim() } else { "false" }

if ([string]::IsNullOrWhiteSpace($GEMINI_API_KEY)) {
  Write-Host "ERROR: GEMINI_API_KEY missing in .env." -ForegroundColor Red
  Add-Report "ERROR: GEMINI_API_KEY missing in .env."
  notepad $REPORT
  exit 1
}

if ($GEMINI_API_KEY -notmatch "^AIza") {
  Write-Host "ERROR: GEMINI_API_KEY does not start with AIza." -ForegroundColor Red
  Add-Report "ERROR: GEMINI_API_KEY does not start with AIza."
  notepad $REPORT
  exit 1
}

Add-Report "ENV CHECK: PASS"
Add-Report "Gemini key present: true"
Add-Report "Gemini key length: $($GEMINI_API_KEY.Length)"
Add-Report "CHERRY_TEST_MODE: $CHERRY_TEST_MODE"
Add-Report "CHERRY_FORCE_QUOTA_EXHAUSTED: $CHERRY_FORCE_QUOTA_EXHAUSTED"
Add-Report ""

Write-Host "`n[2] Killing old local Node processes..." -ForegroundColor Yellow
taskkill /F /IM node.exe 2>$null

Write-Host "`n[3] Fixing package scripts..." -ForegroundColor Yellow

npm pkg set scripts.build="vite build && tsc -p tsconfig.cherry.json"
npm pkg set scripts.cherry:build="tsc -p tsconfig.cherry.json"
npm pkg set scripts.cherry:start="node dist/cherry-server.js"
npm pkg set scripts.start="node dist/cherry-server.js"

Write-Host "`n[4] Clean local build..." -ForegroundColor Yellow

Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

npm install 2>&1 | Tee-Object -FilePath CHERRY_NPM_INSTALL_LOG.txt

npm run build 2>&1 | Tee-Object -FilePath CHERRY_BUILD_LOG.txt
$buildExit = $LASTEXITCODE

Add-Report "LOCAL BUILD EXIT CODE: $buildExit"

if ($buildExit -ne 0) {
  Add-Report ""
  Add-Report "LOCAL BUILD FAILED:"
  Select-String -Path CHERRY_BUILD_LOG.txt -Pattern "error TS|ERROR|Cannot|failed|not found" | Select-Object -First 40 | ForEach-Object {
    Add-Report $_.Line
  }

  notepad $REPORT
  exit 1
}

Add-Report "LOCAL BUILD: PASS"
Add-Report "dist/index.html exists: $(Test-Path dist/index.html)"
Add-Report "dist/cherry-server.js exists: $(Test-Path dist/cherry-server.js)"
Add-Report ""

Write-Host "`n[5] Local endpoint test..." -ForegroundColor Yellow

$node = Start-Process -FilePath "node" -ArgumentList "dist/cherry-server.js" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 5

try {
  $localHealth = Invoke-RestMethod "http://127.0.0.1:4567/health"
  Add-Report "LOCAL /health: PASS"
  Add-Report "frontend: $($localHealth.frontend)"
  Add-Report "ai: $($localHealth.ai)"
} catch {
  Add-Report "LOCAL /health: FAIL"
  Add-Report $_.Exception.Message
}

try {
  $localDebug = Invoke-RestMethod "http://127.0.0.1:4567/debug/gemini-env"
  Add-Report "LOCAL /debug/gemini-env: PASS"
  Add-Report "directRestTest: $($localDebug.directRestTest.status)"
  Add-Report "sdkTest: $($localDebug.sdkTest.status)"
} catch {
  Add-Report "LOCAL /debug/gemini-env: FAIL"
  Add-Report $_.Exception.Message
}

try {
  $localApi = Invoke-RestMethod "http://127.0.0.1:4567/cherry/api-test"
  Add-Report "LOCAL /cherry/api-test: $($localApi.status)"
  Add-Report "summary: $($localApi.summary)"
  Add-Report "detail: $($localApi.detail)"
} catch {
  Add-Report "LOCAL /cherry/api-test: FAIL"
  Add-Report $_.Exception.Message
}

try {
  Stop-Process -Id $node.Id -Force
} catch {}

Add-Report ""

Write-Host "`n[6] Deploying to Cloud Run with env vars..." -ForegroundColor Yellow

cmd /c "gcloud run deploy cherry-core --source . --region australia-southeast1 --allow-unauthenticated" > CHERRY_CLOUD_RUN_DEPLOY_LOG.txt 2>&1
$deployExit = $LASTEXITCODE

Add-Report "DEPLOY EXIT CODE: $deployExit"

if ($deployExit -ne 0) {
  Add-Report ""
  Add-Report "DEPLOY FAILED. Deploy log errors:"
  Select-String -Path CHERRY_CLOUD_RUN_DEPLOY_LOG.txt -Pattern "ERROR|failed|Build failed|error TS|Cannot|not found|npm ERR|No such file" | Select-Object -First 80 | ForEach-Object {
    Add-Report $_.Line
  }

  Add-Report ""
  Add-Report "LATEST CLOUD BUILD:"
  cmd /c "gcloud builds list --region $REGION --limit=1" > CHERRY_LATEST_BUILD.txt 2>&1
  Get-Content CHERRY_LATEST_BUILD.txt | ForEach-Object {
    Add-Report $_
  }

  notepad $REPORT
  exit 1
}

Add-Report "DEPLOY: PASS"
Add-Report ""

Write-Host "`n[7] Testing live Cherry..." -ForegroundColor Yellow

Start-Sleep -Seconds 15

try {
  $liveHealth = Invoke-RestMethod "$LIVE_URL/health"
  Add-Report "LIVE /health: PASS"
  Add-Report "frontend: $($liveHealth.frontend)"
  Add-Report "ai: $($liveHealth.ai)"
} catch {
  Add-Report "LIVE /health: FAIL"
  Add-Report $_.Exception.Message
}

try {
  $liveDebug = Invoke-RestMethod "$LIVE_URL/debug/gemini-env"
  Add-Report "LIVE /debug/gemini-env: PASS"
  Add-Report "directRestTest: $($liveDebug.directRestTest.status)"
  Add-Report "sdkTest: $($liveDebug.sdkTest.status)"
  Add-Report "keyMasked: $($liveDebug.keyMasked)"
} catch {
  Add-Report "LIVE /debug/gemini-env: FAIL"
  Add-Report $_.Exception.Message
}

try {
  $liveApi = Invoke-RestMethod "$LIVE_URL/cherry/api-test"
  Add-Report "LIVE /cherry/api-test: $($liveApi.status)"
  Add-Report "summary: $($liveApi.summary)"
  Add-Report "detail: $($liveApi.detail)"
} catch {
  Add-Report "LIVE /cherry/api-test: FAIL"
  Add-Report $_.Exception.Message
}

notepad $REPORT

Write-Host "`nDone. Report opened: $REPORT" -ForegroundColor Green