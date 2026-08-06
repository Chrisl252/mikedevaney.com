# PROJECT_STATE — mikedevaney.com

Updated: 2026-08-06 (post "business takeover" build)

- LIVE at https://mike-devaney.com. Dark green/gold calendar-first page, SMS booking, portal PIN 2143.
- SEO shipped: title/meta target "bowling lessons Greenfield IN" + "bowling coach Indianapolis";
  JSON-LD (SportsActivityLocation + Person + FAQPage); visible FAQ; OG/twitter cards;
  sitemap.xml + robots.txt live (both 200).
- `GBP-PLAYBOOK.md`: complete copy-paste Google Business Profile + citations launch plan,
  steps marked [CHRIS]/[MIKE]. Key: hybrid storefront listing at Strike Force Lanes (needs
  alley permission + signage for 2026 video verification), primary category Sports school.
- `backend/`: Apps Script booking backend ready (Code.gs + SETUP.md). Site hook is wired but
  DORMANT (`BOOKING_API = ""` in index.html); SMS stays primary until activated.
- Deploy: `npm run deploy` then purge zone cache (CLAUDE.md). Pushed through the SEO commit.

## Start here next session
1. BLOCKED ON MIKE: share the schedule Google Sheet with Chris's account. Then follow
   backend/SETUP.md, paste the /exec URL into BOOKING_API in index.html, deploy, purge, test.
2. BLOCKED ON CHRIS: execute GBP-PLAYBOOK.md (profile + verification + Search Console DNS
   TXT + submit sitemap). Everything is pre-written.
3. After GBP verifies: Bing/Apple/Yelp citations (playbook section 6), review-link SMS template.
