# Cherry Local Worker Level 1

This folder contains a safe, read-only local worker for David's Windows machine.

## Purpose
- Inspect approved project files for diagnosis only.
- Never write, modify, delete, or access secrets.
- Never use API keys or external accounts.

## Allowed folder
C:\Users\nardo\Desktop\mowing\grassroots-mowing-conew

## Run
cd cherry-local-worker-level-1
npm install
npm start

## Test
Invoke-RestMethod -Uri "http://127.0.0.1:4567/health"
