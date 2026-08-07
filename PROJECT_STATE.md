# PROJECT_STATE — mikedevaney.com

Updated: 2026-08-06 (session close: takeover build + client email sent)

- LIVE at https://mike-devaney.com (200; sitemap/robots 200). Dark green/gold calendar-first
  page, SMS booking, portal PIN 2143, full on-page SEO (JSON-LD, FAQ, OG cards).
- Client delivery email SENT to Mike (from Chris's Gmail, 2026-08-06): how it works, support
  line bisketllc@gmail.com, still-to-complete list, GBP two-path verification explained with
  exact video shot lists. Awaiting his reply (inbox confirmation + GBP path choice).
- GBP decision: file path A first (home-verified service-area listing, address hidden), upgrade
  to path B (visible pin at Strike Force, needs sign) later. GBP-PLAYBOOK.md Step 0 has both.
- Sheet: "DeVaney - Lesson Schedule" recreated under chrislucas252@gmail.com, ID
  1G_8BXvug8iC2xSOm06QTTSszV0d9puc1jH3XOoW60Ss (already in backend/Code.gs).
- Deploy: `npm run deploy` + MANDATORY zone cache purge (zone a3047518123d05d95c9213fadacf7ecd).

## Start here next session (the task graph)
Outcome: autonomous booking live + Mike on Google Maps.
DONE: site, SEO, sheet copy, backend code, playbook, client email sent.
NEXT NODE (blocked on Chrome extension reconnecting, then ~30 min):
  1. Publish new sheet to web as CSV; share to pba1817@gmail.com (Editor, no notify).
  2. script.google.com: paste backend/Code.gs (SHEET_ID set), manifest per SETUP.md B,
     run testScan/testEmail, deploy web app (Execute as Me / Anyone), copy /exec URL.
  3. Curl-verify per SETUP.md E, then set BOOKING_API + new SHEET_CSV in index.html,
     deploy, purge, verify, commit.
  4. GBP filing per playbook path A, signed in as chrislucas252; STOP at verification
     (Mike's video, shot list is in the sent email).
BLOCKERS: Chrome + Claude extension disconnected all session (3+ attempts).
WAITING ON MIKE: inbox confirmation, GBP path choice, later the verification video.
