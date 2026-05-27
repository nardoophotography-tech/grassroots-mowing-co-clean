# GrassRoots Stable Frontend Setup

Use this from the root folder:

.\START-FRONTEND.ps1

or:

npm start

Both now start the frontend app only.

Frontend URL:
http://localhost:5173/

Backend/server is isolated for now because it was causing:
- sqlite3 / node-gyp errors
- port 8080 already in use errors

Do not run backend/server commands until backend repair is done separately.
