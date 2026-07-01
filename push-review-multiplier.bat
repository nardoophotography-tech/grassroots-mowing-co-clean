@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"
echo.
echo === STEP 1: npm run build ===
echo.
npm run build
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo BUILD FAILED — aborting. Fix errors before pushing.
  pause
  exit /b 1
)
echo.
echo === BUILD PASSED ===
echo.

echo === STEP 2: git status ===
git status
echo.

echo === STEP 3: git add ===
git add server.ts .env.example index.html public/site.webmanifest public/android-chrome-192x192.png public/android-chrome-512x512.png public/maskable-icon-512x512.png public/apple-touch-icon.png public/favicon-32x32.png public/favicon-16x16.png public/favicon.ico
echo.

echo === STEP 4: git commit ===
git commit -m "feat: payment SMS notifications + Google Review multiplier + PWA icons

- Admin SMS (David) on every Stripe payment-successful and payment-receipt
- Client SMS already in those stages — now admin SMS added alongside
- Cash payment handler: changed from booking-created to payment-successful stage
  so cash payments send proper confirmation to client + admin SMS to David
- scheduleReviewSms() fires 15min after Stripe or cash payment (GOOGLE_PLACE_ID required)
- /api/trigger-review-sms endpoint for manual admin sends
- PWA icons: android-chrome 192/512, maskable 512, apple-touch 180, favicons
- site.webmanifest: brand colors #123d2b / #f4eddf, v=5 cache params
- index.html: manifest + icon links with v=5 cache-busting
- .env.example: GOOGLE_PLACE_ID documented with setup instructions"
echo.

echo === STEP 5: git push ===
git push origin grassroots-clean-recovery-base
echo.
echo === DONE — now go to Render dashboard and manually deploy latest commit ===
echo === Then come back here and tell Claude: Render is Live ===
pause
