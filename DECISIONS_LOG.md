# DECISIONS_LOG — mikedevaney.com

## 2026-08-06 — GBP playbook claim verification sweep
- **Verified against linked sources** (2026-08-06): PBA.com player page confirms 256 events,
  183 cashes, 17 championship-round TV appearances, on tour 1995-2016; PBA all-time titlists
  list confirms Long Island Open won 11/18/2001; Bowling Digital confirms the 2009 Scorpion
  Championship (his second title, at the first World Series of Bowling). These stats stay in
  the GBP description/captions/posts as written.
- **Hedged as unconfirmed in GBP-PLAYBOOK.md** (no source beyond the site's own copy or none
  at all): Storm Products tour manager / head coach role (self-reported on mike-devaney.com;
  Mike must confirm before filing), USBC coach credential, devaney-bowling.square.site
  existence/staleness (now verify-then-act with Mike's OK, not kill-on-sight), the Facebook
  page name "Mike DeVaney Bowling Instruction and Consultation", the Turbo coaches page.
- **Email**: pba1817@gmail.com matches the published contact email on mike-devaney.com but is
  flagged in GBP-PLAYBOOK.md, backend/SETUP.md, and backend/Code.gs as requiring Mike's live
  confirmation (SETUP step 8 delivery test) before go-live - it is the hardcoded booking-alert
  destination.

## 2026-08-06 — Calendar-first redesign + deploy path rebuilt
- **Design**: replaced the email-form page with a calendar-first single page. Booking is SMS
  (`sms:+17027011494?&body=` prefilled from the tapped slot); the email form is gone; email
  lives once in the footer. Coach Portal moved to a quiet footer link, PIN 2143, with a
  guaranteed way back (old version stranded users).
- **Theme**: after a one-deploy light "paper" version, Chris reverted it on sight ("flashbang").
  Dark green + gold is canon for this site. The light Scorecard layout was kept but reskinned
  (`--paper:#14211a`, gold accent `#c9a45c`, green `#3fae60` for OPEN slots).
- **Copy bans (Chris)**: no em/en dashes anywhere, no cash mention, no "text or call", no emoji
  chrome. Byte-verified before each deploy.
- **Credibility**: photo grid replaced by verified, working links (PBA.com, Bowling Digital,
  BOWL.com, archived ESPN telecasts, California Bowling News). Photo triage: only 3 of 17
  images are pro-grade; the rest stay off the site. Banner saved locally
  (`assets/banner_2014_snbt_masters.jpg`), no more Square CDN dependency.
- **Deploy**: killed the Pages + proxy-Worker + dashboard-zip flow. The `mike-devaney-proxy`
  Worker now serves the site directly as static assets (`wrangler.toml` [assets], `npm run
  deploy`). Wrangler OAuth token has workers scopes only, which this path fits. Edge caches
  the HTML, so every deploy is followed by a zone cache purge (id in CLAUDE.md); without the
  purge the old page keeps serving and looks like a failed deploy.
- **Favicon**: bowling pin SVG (cream pin, red neck stripes, dark green tile). Chris's "no
  favicon of a bowling pin wtf" meant it was MISSING from his tab (favicon cache), not
  unwanted; it was briefly swapped for a "D" lettermark and restored.

## 2026-08-06 - GBP verification: two-path decision
- Chris challenged the sign-only verification claim. Research confirmed BOTH paths are
  legitimate: (A) home-verified service-area business, address hidden from public, video =
  house number + gear + business doc, zero friction; (B) visible address at the alley with
  permission + sign, ranks measurably better (Sterling Sky testing: hidden-address listings
  drop in the local pack). Decision: file path A now, upgrade to B when the sign exists.
  GBP-PLAYBOOK.md Step 0 rewritten; client email presents both honestly.
