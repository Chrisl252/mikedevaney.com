# PROJECT_STATE — mikedevaney.com

Updated: 2026-08-06

- LIVE at https://mike-devaney.com (Worker `mike-devaney-proxy` serves static assets; SSL ok, www redirect ok).
- Current design: calendar-first single page in dark green + gold. Paged 5-day schedule grid
  from Mike's Google Sheet; tapping an OPEN slot raises a Book This Time bar that opens SMS
  to (702) 701-1494 with the slot prefilled. Career record + press hyperlinked with gold arrows.
  Coach Portal at page bottom (PIN 2143). Bowling-pin favicon.
- Deploy: `npm run deploy` from repo root, then purge Cloudflare cache (see CLAUDE.md).
- Repo clean, pushed through commit `d3dba3b`.

## Start here next session
1. Open https://mike-devaney.com and confirm the schedule loads from the sheet.
2. Next brick (when Chris asks): autonomous booking, i.e. slot writes back to the Google Sheet
   (Apps Script web endpoint or similar, $0 path) so BOOKED updates without Mike editing.
3. Old Pages project `mikedevaney-com` is now unused by the domain; can be deleted in the
   Cloudflare dashboard whenever (needs Chris or broader token, wrangler token lacks Pages scope).
