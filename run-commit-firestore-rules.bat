@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"
echo.
echo === Committing Firestore security rules fix ===
git status
git add firestore.rules
git commit -m "fix: add Firestore security rules for calendar_blocks collection

- Adds match /calendar_blocks/{blockId} rule
- allow read: if true (public booking calendar needs unauthenticated read)
- allow create/update: if isWorkforce() (admin or staff only)
- allow delete: if isAdmin()
- Fixes: admin save failure (permission-denied on addDoc)
- Fixes: public calendar showing all days available (safeOnSnapshot was
  returning empty array due to permission-denied on the collection)"
git push origin grassroots-clean-recovery-base
echo.
echo === Done ===
pause
