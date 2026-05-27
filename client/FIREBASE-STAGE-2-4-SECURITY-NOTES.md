# GrassRoots Mowing Co - Stage 2.4 Firebase Security Notes

This patch adds Firebase security preparation.

## Created files

- firestore.rules
- firestore.indexes.json
- firebase.json
- FIREBASE-STAGE-2-4-SECURITY-NOTES.md

## Firestore rule behaviour

Public users can only create bookings.

Signed-in admins can:

- read bookings
- update bookings
- delete bookings
- manage inventory
- manage equipment
- manage safety records
- manage settings
- manage pricing

Everything else is denied.

## Temporary security model

This uses:

request.auth != null

That means any signed-in Firebase user is treated as admin.

Before public launch, only create your own admin account in Firebase Auth.

## Later stronger security

Later you can add Firebase custom claims like:

admin: true

Then rules can become:

request.auth.token.admin == true

## To deploy rules later

From this client folder:

firebase login
firebase init
firebase deploy --only firestore:rules

## Current safe test order

1. Keep local mode working.
2. Confirm Admin Login PIN still works.
3. Open Diagnostics page.
4. Add real Firebase config into .env.local.
5. Enable Firebase Auth email/password.
6. Create one admin user.
7. Change VITE_GRASSROOTS_DATA_MODE=firebase.
8. Restart dev server.
9. Submit a public booking.
10. Confirm booking appears in Firestore.
11. Confirm admin can see the booking.
