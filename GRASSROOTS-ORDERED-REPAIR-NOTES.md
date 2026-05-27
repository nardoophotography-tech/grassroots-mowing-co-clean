# GrassRoots Ordered Repair Notes

The working app is the frontend.

Use these commands from the root folder:

.\START-FRONTEND.ps1

or:

npm start

Both now start the frontend only.

Backend/server is isolated because it was causing:

- sqlite3 / node-gyp errors
- port 8080 EADDRINUSE errors

Do not run backend commands until we fix backend separately.

Frontend URL:

http://localhost:5173/

Fallback fresh port:

.\START-FRONTEND-5174.ps1

http://localhost:5174/
