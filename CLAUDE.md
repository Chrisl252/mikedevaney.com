# mikedevaney.com — bootloader

> Global contract: C:\Users\biske\.claude\CLAUDE.md applies. This file adds project facts only.

Birthday-gift booking site for Mike DeVaney (retired 2-time PBA champion, now a bowling coach
at Strike Force Lanes, Greenfield, IN). One static page, no build step.

## Layout
- `index.html` is the whole site (inline CSS/JS). `assets/` holds photos + favicon.
- Canonical: `C:\Code\mikedevaney.com`. GitHub `Chrisl252/mikedevaney.com` = source of truth.

## Deploy (the only path)
- `npm run deploy` (stages `dist/`, then `wrangler deploy`; Worker `mike-devaney-proxy`
  serves static assets on the `mike-devaney.com/*` + `www` routes; Pages is NOT used anymore).
- **Always purge Cloudflare cache after deploy** (edge caches the HTML): cloudflare-api MCP,
  `POST /zones/a3047518123d05d95c9213fadacf7ecd/purge_cache` body `{"purge_everything":true}`.
- Verify with curl (title + `sms:+17027011494` count), not a browser.

## Chris's hard rules for this site
1. NO em dashes or en dashes anywhere in the file (byte-check before shipping).
2. Dark green + gold theme is canon (`--paper:#14211a`, gold `#c9a45c`). Never ship a light theme.
3. No cash/payment mention. No "text or call" phrasing, show the number: (702) 701-1494.
4. Booking is SMS-first (`sms:+17027011494?&body=...`). No email form.
5. Coach Portal: quiet link at page bottom only, PIN 2143, must never strand the user.
6. Photos: professional-grade only (banner, `mike_devaney_pba_02.jpg`, `mike_devaney_pba_06.jpg`
   passed triage; the rest are snapshots, keep them off the page).
7. Career claims stay hyperlinked to verified sources (PBA.com, BOWL.com, Bowling Digital).

## Data
- Schedule comes live from Mike's published Google Sheet CSV (URL in index.html `SHEET_CSV`).
  He marks slots OPEN/BOOKED in the sheet; the site re-renders on load/refresh.
- Later (not built yet): autonomous booking that writes back to the sheet.
