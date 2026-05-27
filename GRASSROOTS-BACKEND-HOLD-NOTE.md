# GrassRoots Mowing Co - Backend Hold Note

The frontend app is working.

The backend/server side is currently separate because root install was hitting:

sqlite3
node-gyp
gyp ERR!

Use frontend-only commands until backend is fixed.

## Start frontend

.\START-FRONTEND.ps1

## Check frontend build

.\CHECK-FRONTEND-BUILD.ps1

## Do not use for now

npm install from the root folder
npm run dev from the root folder if it starts backend/server
npx ts-node server.ts

## Current clean rule

Frontend app work happens in:

C:\Users\nardo\Desktop\mowing\grassroots-mowing-conew\client

Backend/server repair happens later as a separate job.
