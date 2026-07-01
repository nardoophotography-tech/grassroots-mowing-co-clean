@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"
echo.
echo === Committing: fix blockoutStore to use Firestore REST API directly ===
git status src/data/blockoutStore.ts
git add src/data/blockoutStore.ts
git commit -m "fix: rewrite blockoutStore to use Firestore REST API directly

- Root cause: Firestore JS SDK write stream hangs indefinitely in this
  environment (addDoc never resolves, no error, no timeout)
- The REST API works correctly: HTTP 200 on both reads and writes,
  confirmed via live test with David's auth token
- Replaced addDoc/updateDoc with direct fetch() calls to the Firestore
  REST endpoint (projects/.../databases/.../documents/calendar_blocks)
- Replaced useBlockouts() SDK onSnapshot with REST runQuery polling
- Module-level _refreshListeners set: after any write, all mounted
  useBlockouts hooks immediately re-fetch from REST API
- Auth: auth.currentUser.getIdToken() for admin writes; anonymous
  reads work too since rules say 'allow read: if true'
- No other files touched; all types unchanged"
git push origin grassroots-clean-recovery-base
echo.
echo === Done ===
pause
