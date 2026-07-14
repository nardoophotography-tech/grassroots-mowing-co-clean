# GrassRoots Mowing Co. — Full Application Audit & Test Report

**Auditor:** Claude (automated code audit + test authoring)
**Date:** 2026-07-14
**Branch:** `grassroots-clean-recovery-base`
**Baseline commit:** `3267c8f` (Fix typescript build errors)
**Safety net:** branch `full-app-audit-backup-20260714`, tag `before-full-app-audit-20260714`

---

## 0. How to read this report

Every item has one of these statuses:

`NOT TESTED` · `PASS` · `FAIL` · `BLOCKED` · `FIXED` · `RETEST PASS`

A finding is only marked `FIXED` / `RETEST PASS` when there is concrete evidence
(a passing automated test, a verified file diff, or a reproduced-then-resolved defect).

### Environment & honest scope boundary

This pass was run from an isolated Linux analysis sandbox with the two Windows
repository folders mounted. The following were **fully performed** here:

- Source-integrity audit of the whole tree.
- Extraction of core logic into pure, testable modules.
- A real **Vitest** unit/integration suite (58 tests) exercising the *actual wired
  production code* for pricing, phone formatting, invoice/payment maths and booking
  availability. **All 58 pass.**
- Firestore security-rules review and hardening of two real payment-forgery holes.
- Static review of every server API endpoint.

The following stages require credentials / accounts that are **not present in this
sandbox** and are handed off with an exact live-test script (see §Live handoff):
live **Stripe** test payments + webhooks, real **Twilio** SMS, **Firebase**
prod/emulator writes, **git push** to GitHub, and **Render** redeploy. These are
marked `BLOCKED (needs live creds)` rather than being claimed as passed — per the
audit rule *do not claim a feature works merely because the code appears correct*.

---

## 1. Defects found and fixed (with evidence)

| ID | Area | Severity | Finding | Fix | Status |
|----|------|----------|---------|-----|--------|
| D-01 | Dashboard revenue | HIGH | `monthRevenue` was hard-coded to `0` in `Dashboards.tsx` (real payment-summing logic deleted; a `.bak-force-monthly-revenue-zero` file confirmed it was deliberate). Monthly Revenue card always showed `$0` regardless of real paid records. | Reinstated a correct computation: sum of `payments` where status is successful/paid, in the current month, cross-checked against real job IDs to exclude orphaned test records. Reads from the `payments` collection (Admin-SDK-only writes) so it cannot be client-forged. | FIXED |
| D-02 | Booking availability | MEDIUM | Per-slot capacity counted **cancelled** jobs. A cancelled booking kept its morning/afternoon slot blocked, wrongly reducing availability. Only the global daily limit excluded cancelled jobs. | Excluded `status === 'cancelled'` from the per-slot day-jobs filter, matching the global-limit behaviour. Caught by unit test `scheduling > capacity > cancelled jobs do not consume capacity`. | FIXED / RETEST PASS |
| D-03 | Firestore rules | HIGH | `jobs` update rule had an **unauthenticated** affected-keys branch permitting anyone to set `paymentStatus`, `amountPaid`, `stripeSessionId`, `status` on ANY job — payment-state forgery without login. | Rewrote the branch: only permitted when the job has an outstanding `quoteStatus == 'sent'`, and restricted to quote-transition keys (`quoteStatus`, `quoteApprovedAt`, `quoteRejectedAt`, `status`, `updatedAt`, `paymentMethod`). Payment fields removed — they are Admin-SDK-only. | FIXED (needs emulator retest) |
| D-04 | Firestore rules | HIGH | `invoices` update rule had an unauthenticated affected-keys branch (`status`, `paidAt`, `stripeSessionId`) letting anyone mark any invoice `paid`. | Removed the anonymous branch; invoice writes now require `isWorkforce()`. Backend Admin SDK (which sets real payment state) bypasses rules, so legitimate flows are unaffected. | FIXED (needs emulator retest) |
| D-05 | Source integrity | LOW | Two junk files tracked in git whose names literally included apostrophes — `'one_off'` and `'asset_management'` — created by a botched shell command; contents were fragments of a commit message. | Deleted both. | FIXED |
| D-06 | Source integrity | LOW | Garbled duplicated comment fragment in `blockoutStore.ts` (`// (e.g. newly blocked    // (e.g. newly blocked days)`). | Cleaned. | FIXED |
| D-07 | Maintainability / testability | MEDIUM | Core money + scheduling logic was inlined (E.164 in `server.ts`; availability in a 400-line component; block logic coupled to firebase), making it untestable and prone to silent drift. | Extracted pure modules: `src/utils/phone.ts`, `src/utils/invoicing.ts`, `src/utils/scheduling.ts`, `src/data/blockoutLogic.ts`; wired `server.ts` and `ClientCalendar.tsx` to them. Now unit-tested. | FIXED |

---

## 2. Automated test suite (Vitest) — RESULT: 58/58 PASS

Command: `npm test` (`vitest run`). Full output captured 2026-07-14.

```
 ✓ tests/pricing.test.ts     (29 tests)
 ✓ tests/scheduling.test.ts  (13 tests)
 ✓ tests/invoicing.test.ts   ( 9 tests)
 ✓ tests/phone.test.ts       ( 7 tests)
 Test Files  4 passed (4)
      Tests  58 passed (58)
```

### Coverage of the audit's required matrices

- **Pricing engine** — every base package (town_block → ultimate), every client
  tier (one_off 1.15 / returning 1.0 / premium 1.25 / asset_management 1.15),
  grade/condition/urgency surcharges, add-ons, GST (10%), quote-required
  (custom / extreme / quote-required billing), zero-price protection (no normal
  paid booking resolves to $0), legacy key mapping (`one-off`→`one_off`,
  `ultimate-gold`→`premium`, `real-estate`→`asset_management`), partial-rules
  fallback, and historical-snapshot immutability after a config change.
- **Scheduling** — working vs non-working day, first-available-date gate,
  full-date block, AM-only / PM-only slot blocks, calendar full-day block
  (blocks even when not public), public slot block, per-slot capacity, global
  daily limit, cancelled-jobs-free-capacity (D-02), missing-settings safety.
  Timezone pinned to `Australia/Brisbane`.
- **Invoicing** — final amount (base + add-ons − discount, floored at 0),
  full/partial payment, two-part settlement, overpayment cap (amountPaid never
  exceeds total; balance never negative), $0-invoice not marked paid.
- **Phone / E.164** — 04xx→+614, 9-digit mobile, punctuation stripping,
  already-prefixed passthrough, empty/non-digit → '', landline no double-prefix.

---

## 3. Security findings (server API + rules)

### 3a. Unauthenticated state-changing endpoints (server.ts) — REVIEW: needs attention

Several Express endpoints perform privileged writes with **no auth check**. A client
(or anyone) can call them directly by crafting the request:

- `POST /api/jobs/:jobId/complete` — completes a job, creates an invoice, creates a
  Stripe session.
- `POST /api/jobs/:jobId/on-the-way` — sends customer SMS/email, changes status.
- `POST /api/jobs/:jobId/manual-payment` — records a payment, can mark an invoice paid.
- `POST /api/jobs/:jobId/resend-invoice`, `/api/quotes/approve|reject/:jobId`,
  `/api/confirm-cash-payment`, `/api/notify`, `/api/generate-invoice-pdf/:invoiceId`,
  `/api/trigger-review-sms`.
- `POST /api/test-sms` and `/api/admin/test-sms` — **open SMS-send vectors** (abuse /
  toll-fraud / SMS-pumping risk: anyone can make the server send SMS).

`/api/admin/invites` is correctly protected (verifies a Firebase ID token + admin).
The rest rely only on obscurity. **Recommendation:** add an auth middleware that
verifies a Firebase ID token and checks workforce/admin (or an owner check keyed to
the job's clientId) on every state-changing route; at minimum gate `test-sms`.
Status: `REVIEWED — fix recommended` (not auto-applied: needs live auth-flow testing
to avoid breaking the public booking's unauthenticated calls; see live handoff).

### 3b. Firestore rules — FIXED (D-03, D-04)

Payment-state forgery holes on `jobs` and `invoices` closed (see §1). Other rules
reviewed: `payments` and `automationLogs` are correctly Admin-SDK-only
(`write: if false`); `settings`/`pricing_configs`/`bookingSettings`/`calendar_blocks`
are public-read, admin-write (correct for the public booking calendar);
`private_jobs` are admin-only read/write (correct — never exposed to public).
Lower-severity open branches noted for follow-up: `notifications create: if true`
(needed by public-booking admin alerts, but a spam vector) and
`onboarding_links update: if true`.

---

## 4. Baseline technical checks

| Check | Command | Result |
|-------|---------|--------|
| Unit tests | `npm test` (vitest) | **PASS — 58/58** |
| Type-check (audited modules) | `tsc --noEmit` on the extracted pure modules | **PASS — 0 errors** |
| Syntax/parse (all 8 changed files) | esbuild transform | **PASS — all parse clean** |
| Source integrity | `git diff --check` | CLEAN |
| Secrets not staged | `.env` gitignored (`.env*` with `!.env.example`) | CONFIRMED |
| Lockfile safety | package.json vs package-lock.json | **IN SYNC** — no dep added; `npm test` self-provisions vitest via `npx`, so `npm ci` on Render is unaffected |

### Whole-app `tsc --noEmit` + `vite build` — must run where the full tree installs

The complete dependency tree (firebase / firebase-admin + grpc, ~600 packages)
could **not** be installed inside this analysis sandbox (network + memory limits;
repeatedly OOM/timeout). Therefore the *whole-app* type-check and Vite bundle were
not executed here, and are **not claimed** as passed. What WAS verified:

- All 8 changed files parse cleanly (esbuild).
- The extracted pure modules type-check with zero errors (isolated `tsc`).
- All source edits were reconstructed **deterministically from the clean committed
  `HEAD`** plus surgical, count-verified replacements (not free-hand), then confirmed
  to contain 0 null bytes and the intended content.
- The changes are additive/surgical: new pure modules + thin wiring + a rules file +
  two package.json scripts. No dependency or lockfile change.

The authoritative whole-app build gate is **Render's Docker build** (`npm ci` →
`npm run build`), which runs on every deploy. If any cross-module type error existed,
that build would fail and Render would keep the previous good deploy live (no outage).

**To verify + deploy from an environment with full network** (your machine or CI):

```
npm ci
npm test            # 58/58
npx tsc --noEmit    # whole-app type-check — must be 0
npm run build       # must exit 0
git add -A && git commit -m "..." && git push origin grassroots-clean-recovery-base
```

## 5. Deploy + live acceptance — handoff

Push + Render deploy + the live Stripe/Twilio/Firebase acceptance loop are handed
off (see live handoff section): they need GitHub push rights, the Render account,
and Stripe TEST / Twilio test credentials that are not present in this sandbox.

---

## Live handoff — exact acceptance script (for you / Anty on the deployed site)

Run against the live app (`https://grassroots-mowing-co-au.onrender.com`) in an
incognito window, DevTools open (Console + Network):

1. Public booking → enter test customer, pick property size + service → confirm a
   non-zero price shows and updates when service/size change.
2. Pick an available date + slot → submit ONCE → confirm exactly one booking appears
   in Admin, saved price == displayed price, `source=website_booking`.
3. Admin → job → **On My Way** → confirm one customer SMS, one status change, no
   duplicate on double-click / refresh.
4. **Complete Job** → modal opens, booked price prefilled, add an add-on → confirm
   correct final total → invoice created once, Stripe link + PayID shown.
5. Pay with a Stripe **test** card (`4242 4242 4242 4242`) → confirm webhook received
   once, invoice + job flip to paid once, balance 0, receipt SMS/email once,
   dashboard Monthly Revenue increases by the paid amount (validates D-01 fix live).
6. Repeat for: returning client, admin-created booking, blocked day, private job,
   recurring private job, and forced Twilio/email/Stripe failure (confirm no
   duplicate records on retry).

Report any mismatch (screenshot + console + network) back for repair.

---

## 6. IMPORTANT — commit must be done from your machine (sandbox git limitation)

The audit ran in a sandbox with your repo mounted over a network filesystem. That
mount layer **corrupts the git index on any multi-file write** (`git add` of several
files, or `git rm`, produce `fatal: index file corrupt` and a bogus staging of
~260 deletions). Committing from the sandbox would risk pushing a deletion of most
of the app, so **no commit or push was made from here** — deliberately.

**Your files on disk are correct and unharmed.** All fixes are applied to the actual
working tree; `HEAD` (3267c8f), the branch, and the safety refs are intact. Only the
sandbox-side *staging area* was affected, and it has been reset clean.

### Do this on your own machine (git works normally there):

```bash
cd C:\Users\nardo\Desktop\mowing\grassroots-mowing-conew   # the real worktree
git status                     # should show the 15 changes below, nothing weird

# stage exactly the audit changes:
git add server.ts firestore.rules package.json ^
        src/pages/Dashboards.tsx src/components/Calendar/ClientCalendar.tsx ^
        src/data/blockoutStore.ts src/data/blockoutLogic.ts ^
        src/utils/phone.ts src/utils/invoicing.ts src/utils/scheduling.ts ^
        vitest.config.ts tests FULL-APP-TEST-REPORT.md ANTY-LIVE-TEST-SCRIPT.md
git rm "'one_off'" "'asset_management'"      # the two apostrophe-named junk files

# verify BEFORE committing — the diffstat must list ONLY these ~17 files:
git diff --cached --stat

# gate, then commit + deploy:
npm ci && npm test && npx tsc --noEmit && npm run build   # all must pass / exit 0
git commit -m "Audit: fix zero-revenue + slot-capacity bugs, harden Firestore payment rules, extract+unit-test pricing/scheduling/invoicing/phone (58 tests)"
git push origin grassroots-clean-recovery-base            # triggers Render deploy
```

If `git status` on your machine shows the ~260-file deletion again, run
`git read-tree HEAD` (or `git reset`) once to rebuild the index — the working files
are fine.

### The 15 audit changes
- **Modified:** `server.ts`, `firestore.rules`, `package.json`,
  `src/pages/Dashboards.tsx`, `src/components/Calendar/ClientCalendar.tsx`,
  `src/data/blockoutStore.ts`
- **New:** `src/data/blockoutLogic.ts`, `src/utils/phone.ts`,
  `src/utils/invoicing.ts`, `src/utils/scheduling.ts`, `vitest.config.ts`,
  `tests/` (4 suites), `FULL-APP-TEST-REPORT.md`, `ANTY-LIVE-TEST-SCRIPT.md`
- **Deleted:** `'one_off'`, `'asset_management'` (junk)
