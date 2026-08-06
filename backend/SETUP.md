# Booking backend deploy runbook

Google Apps Script web app that reads Mike's schedule sheet, serves it as JSON, and takes reservation requests (OPEN to PENDING). Free, no servers. Prereq is one thing from Mike: edit access to the sheet.

Roles: steps marked [MIKE] need Mike, everything else is [CHRIS].

## A. Prerequisite (DONE 2026-08-06, updated plan)

The sheet was recreated under Chris's account instead of waiting on Mike's share, so ownership
is reversed from the original plan:

1. DONE: "DeVaney - Lesson Schedule" lives in chrislucas252@gmail.com's Drive, an exact copy of
   Mike's published layout. Sheet ID `1G_8BXvug8iC2xSOm06QTTSszV0d9puc1jH3XOoW60Ss` (already
   set in Code.gs). URL:
   https://docs.google.com/spreadsheets/d/1G_8BXvug8iC2xSOm06QTTSszV0d9puc1jH3XOoW60Ss/edit
2. [CHRIS] Share it with pba1817@gmail.com as Editor so Mike manages his own schedule in OUR
   copy from now on (his old sheet retires once he confirms).
3. [CHRIS] File > Share > Publish to web > entire document as CSV; the published CSV URL
   replaces SHEET_CSV in index.html at the same time BOOKING_API is set (one deploy, one purge).

## B. Create the script

3. [CHRIS] Go to https://script.google.com > New project. Name it `mike-devaney-booking`. This is a standalone project in your Drive, not bound to the sheet, on purpose: redeploys never touch Mike's document.
4. [CHRIS] Delete the stub code, paste the full contents of `backend/Code.gs`.
5. [CHRIS] `SHEET_ID` is already set in Code.gs (step A.1). Leave `SMS_GATEWAY` empty. Leave `SCHEDULE_SHEET_NAME` empty unless the schedule tab is not the first tab, in which case set its exact name.
6. [CHRIS] Project Settings (gear icon) > check "Show appsscript.json manifest file". In the editor, set the manifest so the timezone and scopes are pinned:

```json
{
  "timeZone": "America/Indiana/Indianapolis",
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.send_mail"
  ]
}
```

The timezone matters: the past-date filter uses Greenfield's today, not Vegas time.

## C. First run and eyeball check

7. [CHRIS] In the editor, select the function `testScan` and Run. Grant the OAuth consent when prompted (spreadsheets + send mail, your account). Open Execution log: it prints every parsed slot as `date time [STATUS] RrowCcol`. Compare against the sheet by eye. Pay attention to the last date block of each month where the two month columns do not line up row-wise; the counts and statuses must match the sheet exactly.
8. [CHRIS] In `testEmail`, temporarily change `MIKE_EMAIL` usage by editing the constant to chrislucas252@gmail.com, run `testEmail`, confirm the mail arrives and reads right. Set `MIKE_EMAIL` back to pba1817@gmail.com, run `testEmail` once more, and confirm with Mike that he got it on his phone (Gmail app push is the real alert channel). This confirmation is mandatory before go-live: pba1817@gmail.com matches the contact email published on mike-devaney.com but has not been independently confirmed as the inbox Mike actually checks, and a wrong `MIKE_EMAIL` silently drops every booking alert.

## D. Deploy

9. [CHRIS] Deploy > New deployment > type: Web app.
   - Description: `v1`
   - Execute as: **Me** (chrislucas252@gmail.com)
   - Who has access: **Anyone**  (NOT "Anyone with Google account"; that one serves an HTML login page to anonymous visitors and silently breaks the site)
10. [CHRIS] Copy the Web app URL ending in `/exec`. This is the one URL the site will hold.

## E. Verify from outside (raw evidence)

Run these from a normal terminal, not signed in to Google in any way that matters (curl is not signed in):

```
curl -sL "https://script.google.com/macros/s/DEPLOYMENT_ID/exec"
```

Expect JSON starting `{"ok":true,` with a `days` array and no past dates. If you get HTML, the access level is wrong (step 9).

```
curl -sL -X POST -H "Content-Type: text/plain" \
  -d '{"action":"reserve","date":"Aug 11, 2026","time":"1:00 PM","name":"Test Person","phone":"7025550000","note":"deploy test"}' \
  "https://script.google.com/macros/s/DEPLOYMENT_ID/exec"
```

Expect `{"ok":true,"status":"PENDING","date":"2026-08-11","time":"1:00 PM"}`. Then confirm all four artifacts:

11. The schedule sheet cell for that slot now reads PENDING.
12. A `Requests` tab exists with the logged row and EmailStatus SENT.
13. The email arrived at pba1817@gmail.com.
14. Repeat the same POST: expect `{"ok":true,"status":"PENDING"}` again (idempotent duplicate). POST a different name and phone at the same slot: expect `{"ok":false,"error":"TAKEN"}`.

Race test: fire two POSTs for another OPEN slot near-simultaneously (two terminals, or `curl ... & curl ...`). Exactly one `ok:true`, one `TAKEN`.

Cleanup: flip the test cells back to OPEN in the sheet and delete the test rows from Requests.

## F. Wire the site

15. [CHRIS] Follow `backend/site-hook.md` exactly. The `/exec` URL goes into the `BOOKING_API` constant. Ship only after section E passes end to end.
16. [MIKE] The one workflow sentence: "When you get the email, change PENDING to BOOKED to confirm or back to OPEN to pass, and text the person either way."

## G. Updating the code later

Saving code does NOT change the live app. After any edit:

- Deploy > Manage deployments > pencil icon on the existing deployment > Version: **New version** > Deploy.

That keeps the same `/exec` URL. Never choose "New deployment" for an update; it mints a different URL and the site keeps calling the old one. The `/dev` URL only works for you while signed in; never put it in the site.

## H. Rollback

Three independent levels, use the smallest that fits:

1. **Bad code version**: Deploy > Manage deployments > pencil > Version: pick the previous numbered version > Deploy. Same URL, old behavior back in seconds.
2. **Kill the backend entirely**: Deploy > Manage deployments > Archive the deployment (or set Who has access to "Only myself"). The site's fetch fails its 5 second timeout and silently drops to the published CSV tier, which is exactly today's behavior. Nothing user-visible breaks.
3. **Site side only**: set `BOOKING_API` back to the empty string and redeploy the site. The Reserve flow never renders; SMS-only booking remains.

Stray PENDING cells after any rollback: Mike (or Chris) flips them back to OPEN by hand; the Requests tab lists every one the script ever wrote.
