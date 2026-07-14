@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"

echo ============================================================
echo  GrassRoots — Workflow Simplification Push
echo  Files: JobDetail.tsx, types.ts, server.ts
echo ============================================================
echo.
echo  WHAT THIS PUSH INCLUDES:
echo  - New stage-based Workflow panel in JobDetail.tsx
echo    * BOOKED: ON MY WAY button
echo    * ON MY WAY: COMPLETE JOB button
echo    * Completion panel: price, add-ons, discount, notes
echo    * COMPLETE AND SEND INVOICE (auto invoice + SMS + card link)
echo    * PAYMENT PENDING: Pay by card, PayID info, resend, manual
echo    * PAID: receipt + invoice view
echo  - Activity history timeline
echo  - Manual payment modal (PayID, cash, EFT, etc.)
echo  - types.ts: new Job fields + BookingSettings restored
echo  - server.ts: on-the-way, complete, resend-invoice,
echo    manual-payment endpoints + idempotent Stripe webhook
echo ============================================================
echo.

echo Staging files...
git add src/pages/JobDetail.tsx
git add src/types.ts
git add server.ts

echo.
echo Files staged:
git diff --cached --name-only
echo.

git commit -m "feat: stage-based job workflow — ON MY WAY → COMPLETE → INVOICE → PAID

- JobDetail.tsx: new Workflow panel with 4 clear stages
  * Booked: ON MY WAY button → POST /api/jobs/:id/on-the-way
  * On The Way: COMPLETE JOB → opens completion panel
  * Completion panel: pre-filled price, on-site add-ons, discount, notes
  * COMPLETE AND SEND INVOICE → POST /api/jobs/:id/complete
  * Payment pending: card link, PayID details, resend, manual payment
  * Paid: view receipt + invoice
- Activity log timeline display
- Manual payment modal (PayID, cash, EFT, card, other)
- Removed standalone TAKE PAYMENT button
- types.ts: new Job fields (finalAmount, balanceDue, activityLog, etc.)
  BookingSettings types restored
- server.ts: new endpoints with idempotency guards
  on-the-way, complete (with PayID SMS), resend-invoice, manual-payment
  Stripe webhook idempotent (dedup by stripe session ID)"

git push origin grassroots-clean-recovery-base

echo.
echo ============================================================
echo  Push complete. Render will redeploy automatically.
echo.
echo  NEXT STEPS:
echo  1. Wait ~2 min for Render to deploy
echo  2. Open a job in the app and test the workflow:
echo     a. Hit ON MY WAY — check your phone for SMS
echo     b. Hit COMPLETE JOB — enter price, add-on, hit COMPLETE
echo     c. Check phone for invoice SMS with payment link
echo     d. Use RECORD MANUAL PAYMENT to mark it paid
echo     e. Confirm status changes to PAID
echo  3. Admin test number: +61404231448
echo ============================================================
pause
