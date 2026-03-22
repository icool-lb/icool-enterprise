iCOOL ERP Final - Auto Sync Edition

Included:
- Vercel-ready PWA app
- Payroll
- Time Sheet
- Settings (change password + add user)
- Smart auto sync with version checking
- Google Apps Script backend
- Excel template for Google Sheets import/paste

What changed:
- The app now checks Google Sheets automatically every 10 seconds while online.
- It pulls only when the sheet version changes.
- Manual Pull still exists as a full refresh.
- Push sync updates the version automatically.

Important for Google Sheets:
1. Keep these sheet names exactly:
   Projects
   WorkerRates
   WorkerEntries
   MaterialEntries
   Memory_Projects
   Memory_Customers
   Memory_Workers
   Memory_Materials
   Memory_Suppliers
   Memory_Tasks
   Meta

2. The Meta sheet must contain:
   key | value
   version | 1
   last_update | <any date text>

3. When you paste Excel data directly into Google Sheets and want the app to detect it immediately:
   - Increase Meta!B2 (version) from 1 to 2, then 3, then 4...
   - The app will auto-update within about 10 seconds while open and online.

Default login:
admin / 1234
foreman / 1234
