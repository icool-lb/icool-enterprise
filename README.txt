iCOOL ERP - Import once + Append only

What this version does:
- Import your old data from Google Sheet ONCE
- After that, Sync sends NEW records only
- It does NOT wipe sheets
- It does NOT need Pull after initial import
- Worker/material forms keep date + customer + project between saves
- Daily sequence numbering for workers and materials

Main workflow:
1. Paste your old Excel data into Google Sheets
2. Deploy Apps Script backend
3. In the app, click Import Initial Data once
4. Then use the app normally
5. Click Sync New Records Only when you want to append new records

Default logins:
- admin / 1234
- foreman / 1234
