# GrassRoots Mowing Co - Stage 2.5 Cloud Migration Notes

This patch adds cloud migration tools.

## New controls

Dashboard:
- Firebase check
- Upload local to cloud

Diagnostics:
- Run Firebase health check
- Upload local data to Firestore
- Download Firestore data to local

Data:
- Firebase health check
- Upload to cloud
- Download from cloud

## What uploads to Firestore

- bookings
- settings
- pricing
- inventory
- equipment
- safetyRecords

## Required before upload works

1. `.env.local` must have real Firebase config.
2. `VITE_GRASSROOTS_DATA_MODE=firebase`
3. Firebase Auth must be enabled.
4. You must be logged in as admin.
5. Firestore rules must be deployed.
6. Firestore must exist in Firebase Console.

## Safe order

1. Keep app in local mode.
2. Export full JSON backup.
3. Add Firebase config.
4. Enable Auth.
5. Create admin user.
6. Change data mode to firebase.
7. Restart dev server.
8. Admin Login using Firebase email/password or PIN fallback.
9. Run Diagnostics → Firebase health check.
10. Upload local data to Firestore.
11. Check Firestore Console.
12. Download cloud data back into app to confirm.

## Next patch

Stage 2.6 should add a Firebase setup checker that reads `.env.local` and prints missing values in the terminal before the app starts.
