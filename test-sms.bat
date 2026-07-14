@echo off
setlocal enabledelayedexpansion

cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"

echo ============================================================
echo  GrassRoots SMS — LIVE TEST SCRIPT
echo  Runs 3 test loops against the live Render server
echo  Checks: Twilio credentials, admin SMS, client SMS
echo ============================================================
echo.

set BASE_URL=https://grassroots-mowing-co-au.onrender.com

echo Base URL: %BASE_URL%
echo.

echo ============================================================
echo  LOOP 1 — Admin SMS diagnostic (hits /api/admin/test-sms)
echo  Expected: SMS delivered to +61404231448
echo ============================================================
curl -s -X POST "%BASE_URL%/api/admin/test-sms" ^
     -H "Content-Type: application/json" ^
     --max-time 30
echo.
echo.

timeout /t 5 /nobreak >nul

echo ============================================================
echo  LOOP 2 — Client SMS test (hits /api/test-sms)
echo  Expected: SMS delivered to +61404231448
echo ============================================================
curl -s -X POST "%BASE_URL%/api/test-sms" ^
     -H "Content-Type: application/json" ^
     -d "{\"to\":\"+61404231448\",\"message\":\"GrassRoots SMS Test Loop 2: Client channel is working.\"}" ^
     --max-time 30
echo.
echo.

timeout /t 5 /nobreak >nul

echo ============================================================
echo  LOOP 3 — Full booking notification (hits /api/notify)
echo  Stage: booking-created
echo  Expected: client SMS + admin SMS both fire
echo ============================================================
curl -s -X POST "%BASE_URL%/api/notify" ^
     -H "Content-Type: application/json" ^
     -d "{\"stage\":\"booking-created\",\"clientPhone\":\"+61404231448\",\"clientEmail\":\"test@grassrootsmowing.co\",\"clientName\":\"SMS Test Client\",\"job\":{\"id\":\"sms-test-001\",\"clientPhone\":\"+61404231448\",\"clientName\":\"SMS Test Client\",\"serviceType\":\"Residential Standard\",\"address\":\"123 Test Street, Brisbane\",\"price\":150,\"scheduledDate\":1720000000000}}" ^
     --max-time 30
echo.
echo.

echo ============================================================
echo  CHECK RESULTS ABOVE:
echo.
echo  SUCCESS looks like:  {"ok":true,"sid":"SM...","purpose":"..."}
echo  FAILURE looks like:  {"ok":false,"error":"...","code":"..."}
echo.
echo  Common failure codes:
echo    ENV_MISSING     — Twilio credentials not set on Render
echo    21408           — International SMS not enabled (US->AU)
echo    21211           — Invalid destination number
echo    UNKNOWN         — Check Render logs for full Twilio error
echo.
echo  If you see 21408:
echo    1. Log in to twilio.com
echo    2. Go to: Messaging > Settings > Geo Permissions
echo    3. Enable Australia
echo    4. Re-run this script
echo ============================================================
pause
