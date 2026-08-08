# HANDOFF — mike-devaney.com (for the next agent)

Written 2026-08-06. Read CLAUDE.md in this repo first; its hard rules bind every edit.

## The mission
Birthday gift for Mike DeVaney, a retired 2-time PBA Tour champion who now coaches bowling at
Strike Force Lanes, Greenfield IN. Goal: a professional booking site plus a full "business
takeover": Google Business Profile, local SEO to own searches like "bowling coach Indiana",
and an automated booking backend so students reserve times themselves and Mike just confirms.

## What is DONE and live
- https://mike-devaney.com serves from Cloudflare Worker `mike-devaney-proxy` (static assets
  from dist/). Deploy = `npm run deploy` from repo root, then ALWAYS purge the Cloudflare zone
  cache (zone id a3047518123d05d95c9213fadacf7ecd, purge_everything) or stale HTML keeps
  serving. Verify with curl, not a browser.
- The page: dark green + gold (canon, never ship light), calendar-first booking grid fed live
  from a published Google Sheet CSV, tap an OPEN slot then Book This Time opens SMS to
  (702) 701-1494 prefilled. Coach Portal is a footer link, PIN 2143. Zero em/en dashes
  anywhere (byte-check before shipping), no cash mention, no "text or call" phrasing.
- SEO shipped: title "Bowling Lessons in Greenfield IN | PBA Champion Mike DeVaney", JSON-LD
  (SportsActivityLocation + Person + FAQPage), visible FAQ, OG/twitter cards, sitemap.xml,
  robots.txt (both 200). All career claims hyperlinked to verified sources.
- GBP-PLAYBOOK.md: complete, fact-checked Google Business Profile plan. Key calls: hybrid
  storefront listing at the alley (needs alley permission + a physical sign), primary category
  Sports school, name "Mike DeVaney Bowling Coaching", description pre-written, 2026 video
  verification is the expected gate and is Mike-only.
- The schedule sheet was RECREATED under chrislucas252@gmail.com (exact copy of Mike's):
  "DeVaney - Lesson Schedule", ID 1G_8BXvug8iC2xSOm06QTTSszV0d9puc1jH3XOoW60Ss. backend/Code.gs
  already carries this ID. Mike's original sheet still feeds the live site for now.
- backend/: Code.gs (Apps Script web app: GET schedule JSON, POST reserve flips OPEN to
  PENDING with LockService, logs to a Requests tab, emails probowler@mike-devaney.com) + SETUP.md
  (deploy runbook) + site-hook.md (already applied; index.html has `BOOKING_API = ""` dormant).
- Git: GitHub Chrisl252/mikedevaney.com is source of truth, everything pushed. Repo docs
  (PROJECT_STATE.md, DECISIONS_LOG.md) are current.

## The QUEUE (blocked only on a signed-in Chrome session)
All of this needs Chris's authenticated browser (Chrome + Claude extension, or do it by hand):
1. New sheet: File > Share > Publish to web > CSV (copy URL); Share to probowler@mike-devaney.com as
   Editor, notifications off.
2. Apps Script: script.google.com > new project "mike-devaney-booking" > paste backend/Code.gs
   (SHEET_ID already set) > manifest per SETUP.md section B > run testScan + testEmail (test
   address chrislucas252 first) > Deploy web app, Execute as Me, access Anyone > copy /exec URL.
3. Verify from curl per SETUP.md section E (GET JSON, POST reserve, TAKEN race test).
4. Wire the site: set BOOKING_API to the /exec URL AND swap SHEET_CSV to the new published CSV
   in index.html in the same edit, `npm run deploy`, purge, curl-verify, commit, push.
5. GBP: business.google.com signed in as chrislucas252@gmail.com. FILE PATH A (home-verified service-area listing, address hidden; see playbook Step 0 rewrite). Path B (Strike Force pin) is the later upgrade. (decision made: create under
   this account, transfer ownership to Mike's pba1817 later). Enter fields from GBP-PLAYBOOK.md
   Step 1 exactly. STOP at the verification screen; verification is Mike's live video at the
   alley after the sign is up. Do not file verification.
6. After GBP verifies (later): playbook Step 4 (review link, posts, Q&A) and Step 5 citations
   (Bing import first), Step 6 Search Console (DNS TXT via Cloudflare zone above + submit
   sitemap).

## Human-only items (do not attempt)
- Mike: alley permission + sign, the verification video, confirming probowler@mike-devaney.com is the
  inbox he checks, telling students about reviews.
- Chris: any Google sign-in, final say on GBP filing.

## Traps learned the hard way
- Edge cache serves stale HTML after every deploy; purge or it looks like the deploy failed.
- Chris's bans are absolute: em dashes, light themes, cash mentions, "text or call". A single
  em dash anywhere in a shipped file is a defect.
- Favicon = the bowling pin (assets/favicon.svg). Do not replace it.
- Browsers cache favicons for days; not a bug.
- wrangler OAuth (chrislucas252) has workers scopes only: no Pages, no zone cache purge. Purge
  goes through the cloudflare-api MCP connector instead.
