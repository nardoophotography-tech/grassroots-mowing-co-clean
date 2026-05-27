# GrassRoots Mowing Co - Stage 2.6 Firebase Setup Checker

This patch adds terminal health checks.

## New commands

npm run check:firebase

npm run health

## What it checks

- Firebase env values
- local/firebase data mode
- app files
- Firebase files
- Firestore rules files
- whether Firebase config still contains placeholder values

## Safe rule

Keep this until Firebase is fully ready:

VITE_GRASSROOTS_DATA_MODE=local

Only change to this after real Firebase setup is complete:

VITE_GRASSROOTS_DATA_MODE=firebase

## Next stage

Stage 2.7 should add a clear in-app Firebase setup wizard/checklist.
