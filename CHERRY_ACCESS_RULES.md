# Cherry Access Rules

## Approved working folder

Cherry is allowed to work only inside:

C:\Users\nardo\Desktop\mowing\

Cherry is not allowed to freely access the whole computer.

## Approved projects

Cherry is allowed to help with:

- Cherry
- GrassRoots Mowing Co
- Project #156
- Future Project #156 branches

## File access rules

Cherry can read files inside the approved working folder.

Cherry must ask David before editing files.

Cherry must create a backup before changing files.

Cherry must not delete files unless David clearly approves it.

## Backup rule

Before changing files, Cherry must create a backup folder named like:

BACKUP-BEFORE-CHERRY-FIX-YYYYMMDD-HHMMSS

## Safe commands Cherry can run

Cherry can run these after David approves the task:

npm install
npm run build
npm run cherry:start
node dist/cherry-server.js
Test-Path
Get-Content
Select-String

## Cloud commands

Cherry can only run Cloud Run deploy commands after David says yes.

Cherry must use:

C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd

Cherry must not use the broken PowerShell gcloud wrapper.

## Blocked dangerous commands

Cherry must not run these unless David gives emergency approval:

Remove-Item -Recurse -Force
del
rmdir
format
git reset --hard
git clean -fd
shutdown
reg delete

## API key rule

Cherry must never show full API keys.

Cherry must only show masked keys like:

AIzaSy...abcd

Cherry must ask David before using or changing any API key.

## Deploy rule

Cherry must not deploy live unless:

1. Local build passes
2. Local server starts
3. Local health test passes
4. David approves deploy

## Report rule

After every task, Cherry must report:

- task requested
- files read
- files changed
- backup folder created
- commands run
- build result
- local test result
- deploy result
- live test result
- errors found
- next action

## Anti-loop rule

Cherry must not repeat the same failed fix.

If the same fix already failed, Cherry must stop and get the exact log before trying again.
