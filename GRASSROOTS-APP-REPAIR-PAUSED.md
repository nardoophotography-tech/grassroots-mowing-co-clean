# GrassRoots App Repair Paused

We paused this repair because the current folder is tangled.

Current status:
- Frontend app can show the booking page.
- VS Code preview can darken/blank because of preview notification overlays.
- Root/backend/server commands keep interfering.
- Backend/server has shown port 8080 conflicts.
- Earlier installs showed sqlite3/node-gyp style backend problems.
- Repeating patches inside this folder is wasting time.

Decision:
Stop fixing this directly for now.

Next clean method later:
1. Use or create a clean frontend-only copy.
2. Run only the frontend from that folder.
3. Confirm build passes.
4. Confirm Admin Login PIN 4176 works.
5. Confirm Dashboard, Diagnostics, and Data pages work.
6. Only after that, reconnect Firebase/backend/deployment.
7. Do not mix old backend/server scripts into the frontend app.

Safe current task direction:
Move on to other GrassRoots tasks with small patches only.
