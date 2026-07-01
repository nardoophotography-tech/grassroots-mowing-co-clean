@echo off
cd /d "C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE"
echo.
echo === Committing: replace window.confirm with React modal in ScheduleCalendar ===
git status
git add src/pages/ScheduleCalendar.tsx
git commit -m "fix: replace window.confirm() with non-blocking React modal in saveBlockout

- window.confirm() was blocking the JS main thread when overlapping bookings
  were found, causing CDP timeouts and preventing the Firestore write
- Added confirmOverlap state to hold pending payload + overlap message
- Added commitBlockout() helper that performs the actual Firestore write
- saveBlockout() now sets confirmOverlap state and returns instead of blocking
- Added inline confirm modal in JSX (z-[200], shows over blockout form)
- Continuing/cancelling from the modal calls commitBlockout() or clears state
- No window.confirm() calls remain in this file
- No other files touched"
git push origin grassroots-clean-recovery-base
echo.
echo === Done ===
pause
