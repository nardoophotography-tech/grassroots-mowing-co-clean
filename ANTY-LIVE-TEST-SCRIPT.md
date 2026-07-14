# GrassRoots — Independent Live Acceptance Test Script (for Anty)

**Target:** https://grassroots-mowing-co-au.onrender.com
**Rule:** Do NOT edit source code. Record screenshots, console errors, failed network
requests, and exact pass/fail for every step. Report every mismatch back to Claude.

Run each role in a fresh incognito window with DevTools open (Console + Network tabs).

## A. Public website (desktop 1920×1080, mobile 390×844)
1. Landing page loads; logo + images load; no console errors; no failed requests.
2. Nav works; "Client Portal" and "Admin Portal" buttons route correctly.
3. No horizontal scroll on mobile; tap targets adequate; keyboard tab order sane.

## B. Public booking — happy path (new customer)
4. Open booking. Enter test name, valid AU mobile, test email, service address.
5. Select property size + service → a NON-zero price appears.
6. Change service, then property size → price updates each time.
7. Pick an available date + time slot. Submit ONCE.
8. Confirm: exactly ONE booking created; it appears in Admin; saved price == the
   price shown at booking; source == website_booking; persists after refresh.

## C. Public booking — failure cases (each must be blocked gracefully)
9. Invalid phone / missing address / missing size / missing service.
10. Blocked date + full slot are not selectable. Double-click Confirm → still ONE booking.
11. Customer without email still completes. Quote-required service routes to quote, not $0.

## D. Admin "Take Booking"
12. Auto price shows; manual price override requires a reason; saved price flows to Job Detail.

## E. Job workflow (per booking)
13. **On My Way** → exactly one customer SMS; status → on-the-way; double-click/refresh = no dup.
14. **Complete Job** → modal opens; booked price prefilled; add an add-on → correct final total.
15. **Complete & Send Invoice** → invoice created once; unique number; Stripe link + PayID shown;
    one SMS + one email; activity log correct; persists on refresh.

## F. Stripe (TEST mode — card 4242 4242 4242 4242)
16. Pay → success. Confirm webhook received ONCE; invoice + job → paid ONCE; balance 0;
    receipt SMS + email once; **dashboard Monthly Revenue increases by the paid amount**
    (validates the revenue fix live). Also test: declined card (4000...0002), cancelled
    checkout, and a duplicate/replayed webhook → no duplicate payment records.

## G. PayID / manual payment
17. Record PayID/cash/EFT. Confirm PayID *instructions alone* do NOT mark paid — only admin
    confirmation does. Partial payment leaves a balance; overpayment is prevented.

## H. Security spot-checks
18. As a logged-out user, open a job URL and an invoice URL directly → denied.
19. As client A, try to read client B's invoice → denied.
20. Confirm the Monthly Revenue figure matches the sum of real paid records (no mock revenue;
    shows $0 only when there is genuinely no revenue this month).

## Repeat matrix
Run the full B→F loop for: new client, returning client, admin-created booking, a blocked
day, a private job, a recurring private job, and forced Twilio/email/Stripe failures
(confirm retries never create duplicate bookings/invoices/payments/receipts).

## Report format (per step)
`Step # | PASS/FAIL | what you saw | console errors | failed requests | screenshot ref`
