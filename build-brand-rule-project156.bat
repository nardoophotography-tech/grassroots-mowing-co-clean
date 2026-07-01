@echo off
cd /d C:\Users\nardo\Desktop\GRASSROOTS-MASTER-DO-NOT-DELETE
echo === BUILD ===
call npm run build
if errorlevel 1 (
  echo BUILD FAILED
  pause
  exit /b 1
)
echo.
echo === BUILD PASS — committing ===
git add src/services/pdfGenerator.ts src/pages/QuoteApproval.tsx src/pages/InvoicePayment.tsx server.ts
git commit -m "brand: add mandatory Project #156 branding to all PDFs, email templates, and customer-facing pages"
git push origin grassroots-clean-recovery-base
echo.
echo === DONE — check Render for deploy ===
pause
