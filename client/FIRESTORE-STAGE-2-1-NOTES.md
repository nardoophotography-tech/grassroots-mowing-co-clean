# GrassRoots Mowing Co - Stage 2.1 Firestore Notes

This patch adds hybrid booking sync.

## Current safe mode

.env.local defaults to:

VITE_GRASSROOTS_DATA_MODE=local

That means the app still uses browser localStorage.

## To test Firebase mode

1. Create/open Firebase project.
2. Add a Web App.
3. Copy config into `.env.local`.
4. Set:

VITE_GRASSROOTS_DATA_MODE=firebase

5. Restart dev server.

## Collections used first

bookings

## Basic temporary Firestore test rules

Use only for testing. Tighten before public launch.

rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /bookings/{bookingId} {
      allow read, write: if true;
    }
  }
}

## What this patch does

- Local mode still works.
- Firebase mode attempts to load bookings from Firestore.
- New bookings try to save to Firestore.
- Booking updates try to sync to Firestore.
- Booking deletes try to delete from Firestore.
- If Firebase fails, local app keeps working.

## Next patch

Stage 2.2 should add admin authentication and safer Firestore rules.
