# GrassRoots Mowing Co - Stage 2.3 Firebase Auth Scaffold Notes

This patch adds Firebase Auth scaffold while keeping the local PIN fallback.

## What still works

- Public booking page stays open.
- Local PIN login still works.
- Default local PIN is still controlled by:

VITE_GRASSROOTS_ADMIN_PIN=4176

## What is new

The Admin Login screen now has:

- Firebase email/password login
- Local PIN fallback
- Auth status display
- Admin logout that also signs out Firebase user if active

## Firebase Auth setup later

1. Open Firebase Console.
2. Go to Authentication.
3. Enable Email/Password provider.
4. Create one admin user.
5. Add Firebase config values into `.env.local`.
6. Set:

VITE_GRASSROOTS_DATA_MODE=firebase

7. Restart the dev server.

## Important

This is still a scaffold. Firestore security rules must be tightened before public launch.

The next patch should be Stage 2.4:

- admin auth rules notes
- Firestore rules file
- cloud mode diagnostics
- safer admin-only Firestore write preparation
