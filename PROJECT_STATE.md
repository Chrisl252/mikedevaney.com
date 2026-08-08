# PROJECT_STATE — mikedevaney.com

Updated: 2026-08-08 (client response received: email confirmed pba1817@gmail.com, GBP video ready)

- LIVE at https://mike-devaney.com (200; sitemap/robots 200). Dark green/gold calendar-first
  page, SMS booking, portal PIN 2143, full on-page SEO (JSON-LD, FAQ, OG cards).
- Client reply RECEIVED from Mike (2026-08-08): confirmed email pba1817@gmail.com, requested manual confirmation step for bookings (supported in Code.gs PENDING workflow), and asked where to submit GBP video.
- GBP decision: file path A/B, primary email pba1817@gmail.com.
- Sheet: "DeVaney - Lesson Schedule" recreated under chrislucas252@gmail.com, ID
  1G_8BXvug8iC2xSOm06QTTSszV0d9puc1jH3XOoW60Ss (already in backend/Code.gs).
- Deploy: `npm run deploy` + MANDATORY zone cache purge (zone a3047518123d05d95c9213fadacf7ecd).

## Start here next session (the task graph)
Outcome: autonomous booking live + Mike on Google Maps.
DONE: site, SEO, sheet copy, backend code, playbook, client email sent, client reply processed.
NEXT NODE:
  1. Publish new sheet to web as CSV; share to pba1817@gmail.com (Editor, no notify).
  2. script.google.com: paste backend/Code.gs (SHEET_ID set), manifest per SETUP.md B,
     run testScan/testEmail, deploy web app (Execute as Me / Anyone), copy /exec URL.
  3. Curl-verify per SETUP.md E, then set BOOKING_API + new SHEET_CSV in index.html,
     deploy, purge, verify, commit.
  4. File GBP listing on business.google.com under pba1817@gmail.com (or invite manager), trigger video verification step for Mike.
WAITING ON MIKE: recording GBP video at Strike Force Lanes.
