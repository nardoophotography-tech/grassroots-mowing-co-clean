# GrassRoots App — Full Diagnostic Report
Generated: 2026-06-11

---

## Section A — Full Data Flow Trace (what should happen vs what actually happens)

```
BOOKING SAVE FLOW
─────────────────
[Admin] clicks "Take Booking" modal → handleQuickBook() in Dashboards.tsx:143
  → addJob({...}) in useFirebase.ts:78
    → mythosAddDoc() → addDoc(collection(db,'jobs'), data) [Firebase Client SDK]
    → Firestore checks: allow create: if isValidJob(incoming()) [NO AUTH REQUIRED ✅]
    → Write SUCCEEDS — job saved to Firestore ✅
    → Returns docRef.id ✅
  → triggerNotification('booking-confirmed', job) [fire-and-forget] ✅
  → Toast "Booking created for X!" shows ✅

DASHBOARD READS BACK
────────────────────
[AdminDashboard] mounts → useJobs() subscribes with admin query:
  query(collection(db,'jobs'), orderBy('scheduledDate','desc'))  [NO clientId filter]
  → Firestore checks: allow list: if isWorkforce() || ...
  → isWorkforce() = isAdmin() || isStaff()
  → isAdmin():
      check 1: request.auth.token.email in ["nardoophotography@gmail.com",...] 
               → ANONYMOUS TOKENS HAVE NO EMAIL → FALSE ❌
      check 2: get(/users/$(uid)).data.role == 'admin'
               → anonymous UID's users doc has role:'client' (auto-created) → FALSE ❌
  → isWorkforce() = FALSE
  → LIST query DENIED → firestoreError set → jobs = []
  → stats useMemo: if (!jobs.length) return all zeros ❌
  → Dashboard shows: Active Tasks: 0, New Quotes: 0, Unpaid Invoices: 0 ❌

JOB QUEUE (/jobs)
─────────────────
Same useJobs() → same LIST denial → JobList shows empty ❌

INVOICES (/invoices)
────────────────────
useInvoices() → query(collection(db,'invoices'), orderBy('createdAt','desc'))
  → allow list: if isWorkforce() || ... → same denial → invoices = [] ❌

JOB COMPLETION FLOW  
────────────────────
JobDetail.tsx → updateJob(id, {status:'completed'}) in useFirebase.ts:102
  → mythosUpdateDoc(docRef, {status:'completed',...}, updateDoc) 
  → Firestore checks: allow update: if isWorkforce() || ...
  → Same anonymous auth problem → UPDATE DENIED ❌
  (Falls back to anonymous cannot update since they don't own admin_walk_in_ clientId)

INVOICE GENERATION (client-side path)
──────────────────────────────────────
updateJob 'completed' → generateInvoiceForJob(id) in useFirebase.ts:251
  → setDoc(invoiceRef, invoiceData) [client SDK]
  → allow create: if isWorkforce() → isWorkforce() = FALSE for anonymous → DENIED ❌

INVOICE GENERATION (server path)  
──────────────────────────────────
POST /api/jobs/:jobId/complete [Admin SDK, bypasses rules]
  → Creates Stripe checkout session
  → Creates invoice in db.collection('invoices').add(...)  ✅
  → BUT: Stripe session metadata MISSING invoiceId ❌

STRIPE WEBHOOK
──────────────
stripe listen → checkout.session.completed fires
  → const { jobId, invoiceId } = session.metadata
  → invoiceId = undefined (not in metadata from /complete endpoint) ❌
  → if (invoiceId) block SKIPPED → invoice never updated to 'paid' ❌
  → if (jobId) block runs → job.paymentStatus = 'successful', job.status = 'paid' ✅
  → payment record created in payments collection ✅
```

---

## Section B — Function Name Audit (mismatches)

| Call Site | Function Called | Where Defined | Status |
|-----------|----------------|---------------|--------|
| AdminDashboard handleQuickBook | `addJob()` | useFirebase.ts:78 | ✅ Fixed (was missing from destructure) |
| JobDetail.tsx | `updateJob()` | useFirebase.ts:102 | ✅ Correct |
| JobDetail.tsx | `deleteJob()` | useFirebase.ts:344 | ✅ Correct |
| JobDetail.tsx | `markAsPaid()` | useFirebase.ts (useInvoices) | ✅ Correct |
| updateJob status='completed' | `generateInvoiceForJob()` | useFirebase.ts:251 (INTERNAL) | ⚠️ Client-side — blocked by Firestore rules for anon user |
| server.ts /complete | `db.collection('invoices').add()` | Admin SDK | ✅ Works (bypasses rules) |
| Stripe webhook | `session.metadata.invoiceId` | server.ts:562 | ❌ Not in metadata |

---

## Section C — File-by-File Findings

### src/contexts/AuthContext.tsx
**LINES ~202-241 (local dev bypass)**
- When email == admin email + PIN '1560', calls `signInAnonymously()`
- Anonymous token has NO `email` claim
- `onAuthStateChanged` fires → creates users doc with `role: 'client'`
- **RESULT**: Every Firestore read that requires `isAdmin()` or `isWorkforce()` is denied

**ROOT CAUSE OF ALL DASHBOARD / JOB QUEUE / INVOICE ZEROS**

Fix: When `localDevAdminActive` is true and anonymous auth fires, write `role: 'admin'` to the user doc (not `role: 'client'`). The Firestore isAdmin() rule's second check will then pass.

---

### src/hooks/useFirebase.ts

**LINE 201 — stats useMemo early return (Dashboards.tsx:200)**
```tsx
if (!jobs.length) {
  return [{ label: 'Active Tasks', value: 0 }, ...]  // ← BUG
}
```
- Returns 0 for BOTH "no jobs exist" AND "Firestore read failed"
- Cannot distinguish the two states
- **Fix**: Remove the early return. Filters on empty array correctly return 0 anyway.
  The existing error banner (added previously) will show the actual problem.

**LINE 56-58 — useJobs admin query**
```ts
if (profile?.role === 'client') { add clientId filter }
// else: no filter → query ALL jobs
```
- This is correct behavior for admin — but ONLY works if the Firestore rule allows it
- Admin query requires `isWorkforce()` = true → blocked for anonymous user
- **Fix**: AuthContext patch (above) makes anonymous user's doc role='admin', unblocks this

**LINE 124 — generateInvoiceForJob called client-side**
- Triggered by `updateJob({status:'completed'})`  
- Uses `setDoc(invoiceRef, ...)` → requires `allow create: if isWorkforce()`
- Blocked for anonymous user  
- **Fix**: Same AuthContext patch unblocks this too

**LINE 307 — generateInvoiceForJob payment link**
```ts
const paymentLink = `${window.location.origin}/pay/${invoiceRef.id}`;
```
- Uses `window.location.origin` — works client-side only, not from server
- If invoice is generated via `/api/jobs/:jobId/complete` (server), it uses `process.env.VITE_APP_URL || 'http://localhost:3000'`
- **Not a bug**, just a different path. Consistent for each flow.

---

### src/pages/Dashboards.tsx

**LINE 200-208 — stats useMemo early return** (see above)

**LINE 58 — useJobs destructure** ✅ Fixed in prior session
```tsx
const { jobs, addJob, broadcastDailyStart, loading: jobsLoading, firestoreError: jobsFirestoreError } = useJobs();
```

**Error banner**: was added in previous session — confirm it's rendering (see test steps).

---

### server.ts

**LINES 808-833 — /api/jobs/:jobId/complete Stripe session missing invoiceId**

The invoice is created at lines 837-857 (AFTER the Stripe session — actually wait, let me re-examine ordering):

```ts
// Line 808: stripe.checkout.sessions.create(...)  ← CREATES SESSION FIRST
// Line 834: paymentLink = session.url
// Line 857: const invoiceRef = await db.collection("invoices").add(invoiceData) ← CREATES INVOICE AFTER
```

The Stripe session is created BEFORE the invoice. So `invoiceRef.id` doesn't exist yet when building metadata. This is why `invoiceId` can't be in the metadata.

**Fix**: Create the invoice FIRST, get `invoiceRef.id`, THEN create the Stripe session with `invoiceId` in metadata.

---

### firestore.rules

**LINE 167-174 — jobs collection**
```
allow list: if isWorkforce() || (isSignedIn() && resource.data.clientId == request.auth.uid);
```
- `isWorkforce()` fails for anonymous user (no email, role='client' in doc)
- Second condition fails for unfiltered admin query (clientId ≠ anon UID)
- **Root cause confirmed**

**LINE 27-33 — isAdmin() function**
```
function isAdmin() {
  return isSignedIn() && (
    (request.auth.token.email in [...]) ||        ← fails for anon (no email)
    (exists(...users/uid) && get(...).role == 'admin')  ← fails (anon doc = client)
  );
}
```

**LINE 170 — jobs allow create**
```
allow create: if isValidJob(incoming());  ← NO AUTH required
```
- Anonymous users CAN write jobs ✅ (writes succeed)

---

## Section D — Route Confirmation

| URL | Component | Guard | Notes |
|-----|-----------|-------|-------|
| /dashboard | `Dashboard` → `AdminDashboard` | effectiveProfile.role='admin' | ✅ Renders admin view |
| /jobs | `JobList` | `RoleGuard roles=['admin','staff']` | ✅ Accessible as admin |
| /jobs/new | `NewJob` | `RoleGuard roles=['admin','staff']` | ✅ Accessible |
| /invoices | `InvoiceList` | `RoleGuard roles=['admin']` | ✅ Accessible |
| /jobs/:id | `JobDetail` | None visible | Uses useJobs() — same read problem |

RoleGuard uses `profile?.role` — effectiveProfile override means this reads 'admin' → all routes accessible. ✅

---

## Section E — Firestore Collection Audit

| Collection | Created by | Read by | Write permission | Read permission |
|------------|------------|---------|-----------------|-----------------|
| `jobs` | addJob (any via isValidJob) | useJobs | ✅ Anonymous can write | ❌ Anonymous cannot list |
| `invoices` | generateInvoiceForJob (client, isWorkforce) / /api/complete (server) | useInvoices | ❌ Anonymous cannot write | ❌ Anonymous cannot list |
| `payments` | Stripe webhook only (server) | usePayments (isWorkforce) | ❌ `allow write: if false` | ❌ Anonymous cannot list |
| `users` | AuthContext (anon creates own doc as 'client') | useAuth | Owner can write own | Owner can read own |
| `notifications` | notificationService.notify() | subscribeToNotifications | ✅ Anyone can create | Owner can list |
| `settings` | Admin only | useSettings | Admin only | ✅ Public read |

**Conclusion**: Jobs ARE being saved to Firestore (writes succeed). They simply cannot be read back by the anonymous admin session.

---

## Section F — Stripe Metadata Audit

### From `/api/jobs/:jobId/complete` (server.ts ~line 826):
```js
metadata: {
  jobId,
  flowType: 'final_invoice',
  clientEmail: job.clientEmail || '',
  clientName: job.clientName || ''
  // ❌ MISSING: invoiceId
}
```

### Webhook expects (server.ts line 562):
```js
const { jobId, invoiceId, flowType } = session.metadata || {};
```

**Gap**: `invoiceId` not in metadata → webhook's `if (invoiceId)` block skipped → invoice never marked `paid` after Stripe payment.

### From `generateInvoiceForJob` (client-side, useFirebase.ts):
- Creates invoice with `paymentLink = /pay/${invoiceRef.id}` ✅
- Does NOT create Stripe session (client-side doesn't call Stripe directly)
- Invoice payment link goes to InvoicePayment page which calls `/api/create-checkout-session`

### `/api/create-checkout-session` — not yet read, but this is the path for InvoicePayment.tsx paying an existing invoice. This should include `invoiceId` in metadata if implemented correctly.

---

## Section G — Diagnostic Summary (Issues by Priority)

### 🔴 CRITICAL — Blocks everything

**BUG-01: Anonymous auth → Firestore denies all admin reads**
- File: `src/contexts/AuthContext.tsx` — onAuthStateChanged callback (lines ~250-280)
- Why: Anonymous auth tokens have no email; anonymous UID's users doc is `role:'client'`; `isAdmin()` and `isWorkforce()` both return false
- Impact: Dashboard = 0, Job Queue empty, Invoices empty, job completion blocked, client-side invoice creation blocked
- Risk: Low — only affects local dev bypass path
- Fix: Write `role: 'admin'` to anonymous user's Firestore users doc when `localDevAdminActive` is true

---

### 🟠 HIGH — Breaks specific flows

**BUG-02: Stripe webhook can't update invoice to 'paid'**
- File: `server.ts` lines 808-834 (Stripe session creation inside `/api/jobs/:jobId/complete`)
- Why: Invoice is created AFTER Stripe session; `invoiceId` never added to session metadata
- Impact: After customer pays via Stripe, invoice stays `status:'sent'` forever; only the job gets updated
- Risk: Low to fix — reorder: create invoice first, then Stripe session with invoiceId in metadata
- Fix: Move invoice creation to BEFORE Stripe session creation; add `invoiceId` to metadata

**BUG-03: stats useMemo returns zeros for empty jobs array (can't distinguish error from empty)**
- File: `src/pages/Dashboards.tsx` lines 200-208
- Why: `if (!jobs.length) return all-zeros` — treats Firestore read failure identically to "no jobs exist"
- Impact: No visual feedback that something is wrong (until error banner shows)
- Risk: Very low
- Fix: Remove the early-return guard; the filter expressions on an empty array return 0 correctly anyway

---

### 🟡 MEDIUM — Affects usability after critical bugs fixed

**BUG-04: Quick-book price is always $0 — can't test Stripe**
- File: `src/pages/Dashboards.tsx` — `handleQuickBook` sends `price: 0`
- Why: Quick-book form has no price field
- Impact: `/api/jobs/:jobId/complete` creates a $0 Stripe session; Stripe minimum is ~$0.50 AUD
- Fix: Add a "Price ($)" field to the quick-book modal form

**BUG-05: updateJob 'completed' triggers client-side generateInvoiceForJob + server /complete creates another invoice**
- Two invoice creation paths can both fire for the same job, creating duplicate invoices
- The client-side `generateInvoiceForJob` guards with `if (job.invoiceId) return` — but there's a race if the server creates the invoice first and the client hasn't refreshed yet
- After BUG-01 is fixed, the client-side path will work again — need to ensure only ONE path runs per job

---

### 🟢 LOW — Minor / already partially fixed

**BUG-06: Error banner in AdminDashboard may not be visible**
- From prior session: `jobsFirestoreError` was added to destructure and a banner was added to JSX
- Verify the banner renders and clearly explains the issue

**BUG-07: STRIPE_SECRET_KEY visible in screenshot**
- Action required: Roll/regenerate the Stripe TEST key before any live payment testing
- Go to: dashboard.stripe.com → Developers → API Keys → Roll secret key
- Update `.env` with new key (do NOT paste key in chat)
- Server restart required after updating `.env`

---

## Section H — Safe Patch Plan (in order)

```
PATCH ORDER:
1. Fix AuthContext — write role:'admin' for anonymous dev admin
2. Fix Dashboards.tsx — remove stats early-return guard  
3. Fix server.ts — create invoice before Stripe session; add invoiceId to metadata
4. Add price field to quick-book modal
5. Verify error banner renders correctly
```

### PATCH 1 — AuthContext.tsx: Write role:'admin' for anonymous dev admin
**File**: `src/contexts/AuthContext.tsx`
**Where**: Inside `onAuthStateChanged` callback, in the branch that handles the anonymous user when `localDevAdminActiveRef.current` is true

Change this logic (currently writes `role: 'client'` for all new user docs):
```ts
// When anonymous auth fires during dev admin bypass,
// ensure the users doc has role:'admin' so Firestore isAdmin() check passes
if (user.isAnonymous && localDevAdminActiveRef.current) {
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: 'nardoophotography@gmail.com',  // fake email for display
    role: 'admin',
    displayName: 'Admin (Dev)',
    createdAt: Date.now()
  }, { merge: true });
}
```

This makes `isAdmin()` → `get(users/uid).data.role == 'admin'` return TRUE → all reads unblocked.

---

### PATCH 2 — Dashboards.tsx: Remove early-return guard from stats useMemo
**File**: `src/pages/Dashboards.tsx`
**Lines**: 200-208

Remove:
```tsx
if (!jobs.length) {
  return [
    { label: 'Active Tasks', value: 0, icon: MapPin, to: '/jobs' },
    { label: 'New Quotes', value: 0, icon: FileText, to: '/jobs?filter=quoted' },
    { label: 'Unpaid Invoices', value: 0, icon: Clock, to: '/invoices' },
    { label: 'Monthly Revenue', value: '$0', icon: DollarSign, to: '/invoices' },
  ];
}
```
Keep the rest of the useMemo (lines 210-226) as-is. It will return 0s naturally when jobs is empty.

---

### PATCH 3 — server.ts: Create invoice first, then Stripe session with invoiceId
**File**: `server.ts`
**Route**: `POST /api/jobs/:jobId/complete` (around line 800)

Reorder:
1. First create the invoice document → get `invoiceRef.id`
2. Then create Stripe session with `invoiceId: invoiceRef.id` in metadata
3. Update the invoice with the `paymentLink` from the Stripe session

---

### PATCH 4 — Dashboards.tsx: Add price field to quick-book form
**File**: `src/pages/Dashboards.tsx`
**Where**: `quickBookForm` state and the modal JSX

Add `price: 0` to quickBookForm state, add a number input to the modal, and use it in `handleQuickBook`.

---

### PATCH 5 — Verify error banner exists in AdminDashboard JSX
Confirm the red error banner showing `jobsFirestoreError` is present in the JSX return of AdminDashboard.
If missing, add it near the top of the returned JSX.

---

## Section I — Beginner Test Steps After Patching

### Step 1: Verify the fix works (after PATCH 1 + hard reload)

1. Open `http://localhost:3000/?localAdmin=true`
2. Log in: email `nardoophotography@gmail.com`, password `1560`
3. Open F12 → Console
4. Look for: `Firestore Connection: Established` ✅
5. **Should NOT see**: `FirebaseError: Missing or insufficient permissions`
6. Dashboard should now show real counts (not all zeros)

### Step 2: Test "Take Booking" end-to-end

1. Dashboard → "Take Booking" button
2. Fill in: Name = "Test Client", Address = "123 Test St", Date = tomorrow, Price = $150
3. Click "Confirm Booking"
4. Expected: Green toast "Booking created for Test Client! Job ID: xxxx"
5. Dashboard Active Tasks count should go up by 1
6. Navigate to `/jobs` → new job should appear in the list

### Step 3: Test Job Queue reads

1. Go to `/jobs`
2. You should see the job from Step 2
3. If still empty, open F12 → Console → look for red Firestore permission errors

### Step 4: Complete a job and generate invoice

1. Click on the job from Step 2
2. Mark status → "Completed"  
3. Expected: Toast "Invoice INV-xxxxxx issued." within a few seconds
4. Go to `/invoices` — new invoice should appear
5. Invoice status should be `sent`

### Step 5: Test Stripe Checkout (requires server running + Stripe CLI)

**Terminal 1** — run app:
```
npm run dev
```

**Terminal 2** — run Stripe webhook listener:
```
stripe listen --forward-to localhost:3000/api/stripe-webhook
```
(copy the `whsec_...` secret it prints → update `STRIPE_WEBHOOK_SECRET` in `.env` → restart server)

**In app**:
1. Go to the invoice from Step 4
2. Click "Pay Now" / "Pay Online"
3. Should open Stripe hosted checkout page
4. Use test card: `4242 4242 4242 4242`, any future expiry, any CVC, any postcode
5. Complete payment
6. Expected: Redirect back to app with success URL
7. Invoice should update to `status: 'paid'`
8. Job should update to `paymentStatus: 'successful'`

**Verify in Stripe dashboard**: dashboard.stripe.com → Payments — you should see the test payment.

### Step 6: Verify webhook processed correctly

In Terminal 2 (Stripe CLI), you should see:
```
--> checkout.session.completed [evt_xxx]
<-- 200 OK [/api/stripe-webhook]
```
And in Terminal 1 (server logs):
```
[Stripe Webhook]: Processing final_invoice checkout. session=..., jobId=..., invoiceId=...
[Stripe Webhook]: Firestore updates committed successfully for session ...
```

---

## Security Reminder

⚠️ The Stripe TEST secret key (`sk_test_...`) was visible in a screenshot during this session.  
**Before switching to live/production mode**, roll/regenerate the key:  
→ dashboard.stripe.com → Developers → API Keys → Roll secret key  
→ Update `STRIPE_SECRET_KEY` in `.env` with the new key  
→ Do NOT paste the key value in chat  
→ Restart the server after updating `.env`

---

*End of diagnostic report*
