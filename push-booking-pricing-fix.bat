@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"

echo ============================================================
echo  GrassRoots — Booking Simplification + Pricing Fix
echo ============================================================
echo.
echo  WHAT THIS PUSH INCLUDES:
echo.
echo  PRICING ENGINE (pricingEngine.ts)
echo  - Fixed client type key mismatch: 'one-off' -> 'one_off'
echo    'ultimate-gold' -> 'premium', 'real-estate' -> 'asset_management'
echo  - Fallback defaults now match constants.ts (no more 0x multiplier)
echo.
echo  NEW UTILITY (src/utils/pricing.ts)
echo  - calculateBookingPrice() - single source of truth for all booking prices
echo  - Deep-merges Firestore rules over constants.ts defaults
echo  - Returns: pricingStatus, calculatedBasePrice, estimatedTotal, snapshot
echo  - pricingStatus: 'calculated', 'quote_required', 'zero_price', 'no_service'
echo.
echo  TYPES (types.ts)
echo  - Job interface: +calculatedBasePrice, +bookedPrice, +priceAdjusted,
echo    +priceAdjustedReason, +pricingStatus, +pricingRuleVersion
echo  - BookingSettings interface: restored (was lost in previous session)
echo  - Removed duplicate trailing garbage lines
echo.
echo  PUBLIC BOOKING (Booking.tsx)
echo  - Removed Step 1 client type selector - all public bookings = one_off
echo  - Renamed steps: Your Details / Schedule / Service / Price Summary / Payment
echo  - Email field is now optional (not required)
echo  - Service cards now show calculated price with one_off multiplier applied
echo  - Price Summary step shows subtotal + GST breakdown
echo  - Zero-dollar protection blocks submit if price = $0 (non-quote service)
echo.
echo  ADMIN QUICK BOOK (Dashboards.tsx)
echo  - Price auto-calculates from service + client type selection
echo  - Manual override checkbox + required reason field
echo  - Zero-dollar protection blocks Book Now if price = $0
echo  - Saves pricingSnapshot + calculatedBasePrice + bookedPrice to job record
echo  - Saves priceAdjusted + priceAdjustedReason when admin overrides
echo.
echo  JOB COMPLETION (JobDetail.tsx)
echo  - Completion panel defaults to bookedPrice (preserved at booking)
echo    falling back to pricingSnapshot.total then job.price
echo  - Hint text shows original booked price for reference
echo  - Zero-dollar protection already in place (blocks invoice at $0)
echo ============================================================
echo.

echo Staging files...
git add src/types.ts
git add src/services/pricingEngine.ts
git add src/utils/pricing.ts
git add src/pages/Booking.tsx
git add src/pages/Dashboards.tsx
git add src/pages/JobDetail.tsx

echo.
echo Files staged:
git diff --cached --name-only
echo.

git commit -m "feat: simplify booking UX + fix $0 pricing bug

Pricing engine:
- Fix client type key mismatch in getDefaultPricingRules()
  'one-off' → 'one_off', 'ultimate-gold' → 'premium', 'real-estate' → 'asset_management'
- Defaults now match constants.ts so one_off multiplier (1.15) applies correctly

New utility src/utils/pricing.ts:
- calculateBookingPrice() — single pricing source of truth
- Deep-merges Firestore rules over static defaults
- Returns structured result with pricingStatus + snapshot

Public Booking.tsx:
- Remove step 1 client type selector (all public = one_off)
- Rename steps to plain English: Your Details / Schedule / Service / Price Summary
- Email made optional
- Service cards show calculated price (with multiplier) not just base
- Price Summary shows subtotal + GST breakdown
- Zero-dollar protection on submit

Admin quickBook modal (Dashboards.tsx):
- Auto-calculates price from service + client type
- Manual override checkbox + reason field
- Zero-dollar protection
- Saves full pricing provenance to job record

JobDetail.tsx:
- Completion panel loads bookedPrice → pricingSnapshot.total → job.price
- Hint text shows booked vs current price

types.ts:
- Job: +calculatedBasePrice, +bookedPrice, +priceAdjusted, +priceAdjustedReason,
  +pricingStatus, +pricingRuleVersion
- BookingSettings interface restored"

git push origin grassroots-clean-recovery-base

echo.
echo ============================================================
echo  Push complete. Render will redeploy automatically.
echo.
echo  WHAT TO TEST:
echo  1. Public booking form — go to /booking
echo     a. Should start at 'Your Details' (no client type selector)
echo     b. Service cards should show calculated prices (e.g. $189.75 not $150)
echo     c. Price Summary should show subtotal + GST breakdown
echo     d. Email field should be optional
echo  2. Admin quickBook (Take Booking button in Admin Panel)
echo     a. Select a service — price should auto-fill
echo     b. Change client type — price should update
echo     c. Try booking at $0 — should be blocked
echo     d. Enable 'Manual override' — enter price + reason
echo     e. Confirm job created with pricingSnapshot in Firestore
echo  3. Open a job → Complete Job → check booked price is pre-filled
echo     correctly (not $0, not a different price than what was quoted)
echo ============================================================
pause
