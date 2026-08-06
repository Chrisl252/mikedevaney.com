/**
 * Mike DeVaney lesson booking backend, v1
 * Standalone Google Apps Script web app. Runs under chrislucas252@gmail.com,
 * opens the schedule sheet by ID, serves the schedule as JSON, and
 * accepts reservation requests that flip one status cell OPEN to PENDING.
 * Mike confirms by hand in the sheet: PENDING to BOOKED, or back to OPEN.
 *
 * Deployment contract (see SETUP.md):
 *   Deploy as Web app, Execute as Me, Who has access: Anyone.
 *   Every code change needs Manage deployments > Edit > New version.
 *
 * Timezone: appsscript.json must pin "timeZone": "America/Indiana/Indianapolis"
 * so the past-date filter uses Greenfield's today, not the owner's.
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

var SHEET_ID = '1G_8BXvug8iC2xSOm06QTTSszV0d9puc1jH3XOoW60Ss'; // "DeVaney - Lesson Schedule", owned by chrislucas252@gmail.com (created 2026-08-06)
var SCHEDULE_SHEET_NAME = '';                 // '' = use the first sheet; pin by name once known
var REQUESTS_SHEET_NAME = 'Requests';
var MIKE_EMAIL = 'pba1817@gmail.com';         // matches contact email on mike-devaney.com; CONFIRM
                                              // with Mike via SETUP.md step 8 before go-live - a
                                              // wrong address silently drops every booking alert.
var SMS_GATEWAY = '';                         // keep '' (off). Carrier email-to-SMS gateways are
                                              // mostly dead. Only set '7027011494@vtext.com' if
                                              // Mike is confirmed Verizon; best effort only.
var TZ = 'America/Indiana/Indianapolis';
var VENUE = 'Strike Force Lanes';
var CACHE_KEY = 'sched.v1';
var CACHE_SECONDS = 60;
var MAX_PENDING_PER_PHONE = 3;
var LOCK_WAIT_MS = 10000;

// Status vocabulary on the schedule tab. Anything else is treated as
// unavailable and is never mutated.
var STATUS_OPEN = 'OPEN';
var STATUS_PENDING = 'PENDING';
var STATUS_BOOKED = 'BOOKED';

// "Aug 11, 2026" matches. "August 2026" (no comma plus day) and address lines do not.
var DATE_RX = /^[A-Z][a-z]{2,8}\.? \d{1,2}, \d{4}$/;
var TIME_RX = /^\d{1,2}:\d{2}\s?[AP]M$/i;

var MONTHS = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12
};

// ---------------------------------------------------------------------------
// HTTP entry points
// ---------------------------------------------------------------------------

/**
 * GET /exec or GET /exec?action=schedule
 * Returns the schedule as JSON. Cached 60 seconds.
 */
function doGet(e) {
  try {
    var cache = CacheService.getScriptCache();
    var hit = cache.get(CACHE_KEY);
    if (hit) return jsonOut(hit);

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = getScheduleSheet(ss);
    var slots = scan(sheet);
    var body = JSON.stringify(buildSchedule(slots));
    cache.put(CACHE_KEY, body, CACHE_SECONDS);
    return jsonOut(body);
  } catch (err) {
    return jsonOut(JSON.stringify({ ok: false, error: 'SERVER', detail: String(err) }));
  }
}

/**
 * POST /exec
 * Body is a JSON string sent as text/plain (a CORS simple request, no preflight):
 *   {"action":"reserve","date":"Aug 11, 2026","time":"1:00 PM",
 *    "name":"Jane Doe","phone":"3175551234","note":"","hp":""}
 * Always HTTP 200; the outcome lives in the JSON body.
 */
function doPost(e) {
  var out = null;
  var v = null;
  var emailRowInfo = null;

  try {
    var req = JSON.parse(e.postData.contents);

    // Honeypot: bots fill hidden fields. Pretend success, do nothing.
    if (req.hp) return jsonOut(JSON.stringify({ ok: true, status: STATUS_PENDING }));

    v = validate(req);
    if (!v.ok) return jsonOut(JSON.stringify({ ok: false, error: 'BAD_INPUT' }));

    var lock = LockService.getScriptLock();
    if (!lock.tryLock(LOCK_WAIT_MS)) {
      return jsonOut(JSON.stringify({ ok: false, error: 'LOCKED' }));
    }

    try {
      // Everything is re-read fresh inside the lock. Cell addresses are never
      // remembered across requests, so Mike inserting rows cannot hurt us.
      var ss = SpreadsheetApp.openById(SHEET_ID);
      var sheet = getScheduleSheet(ss);
      var slots = scan(sheet);
      var slot = findSlot(slots, v.dateKey, v.time);

      if (!slot) {
        out = { ok: false, error: 'NOT_FOUND' };
      } else if (slot.status === STATUS_PENDING && samePhonePending(ss, v)) {
        // Duplicate tap on a slow connection is a success, not an error.
        out = { ok: true, status: STATUS_PENDING, date: v.dateKey, time: v.time, duplicate: true };
      } else if (slot.status !== STATUS_OPEN) {
        out = { ok: false, error: 'TAKEN' };
      } else if (pendingCountForPhone(ss, slots, v.phone) >= MAX_PENDING_PER_PHONE) {
        out = { ok: false, error: 'RATE_LIMIT' };
      } else {
        // The single mutation this script is allowed to make.
        sheet.getRange(slot.row, slot.col).setValue(STATUS_PENDING);
        SpreadsheetApp.flush(); // durable before the lock is released
        emailRowInfo = logRequest(ss, v, slot);
        CacheService.getScriptCache().remove(CACHE_KEY);
        out = { ok: true, status: STATUS_PENDING, date: v.dateKey, time: v.time };
      }
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    out = { ok: false, error: 'BAD_INPUT' };
  }

  // Mail runs outside the lock and is best effort. A mail failure never
  // blocks or rolls back the reservation; the Requests row records it.
  if (out && out.ok && out.status === STATUS_PENDING && !out.duplicate && v) {
    var emailStatus = 'SENT';
    try {
      notifyMike(v);
    } catch (mailErr) {
      emailStatus = 'EMAIL_FAIL';
    }
    try {
      if (emailRowInfo) {
        emailRowInfo.sheet.getRange(emailRowInfo.row, 9).setValue(emailStatus);
      }
    } catch (ignored) {}
    delete out.duplicate;
  }
  if (out && out.duplicate) delete out.duplicate;

  return jsonOut(JSON.stringify(out || { ok: false, error: 'BAD_INPUT' }));
}

// ---------------------------------------------------------------------------
// Sheet parsing
// ---------------------------------------------------------------------------

/**
 * Per-column state scan of the whole schedule tab.
 *
 * Mike's layout: month blocks live in column pairs (B/C for one month, D/E for
 * the next). Each pair has a 4 row header (venue, street, city, month label),
 * then repeating groups of a date cell, usually one blank row, then 4 or 5
 * time rows with the status in the column immediately right.
 *
 * The column pairs are independent vertical streams and do NOT align row-wise
 * (in the sample, row 61 has Aug 31 in column B beside a September 4:00 PM in
 * column D). So: no fixed row offsets, no cross-column row blocks. Each column
 * is scanned on its own; a date cell sets the current date for that column and
 * every time cell below it belongs to that date until the next date cell.
 *
 * getDisplayValues, not getValues: Sheets auto-types "Aug 11, 2026" and
 * "1:00 PM" into Date objects and the string regexes would miss them.
 *
 * Returns [{dateKey, dateLabel, time, status, row, col}] with row/col being
 * the 1-indexed address of the STATUS cell.
 */
function scan(sheet) {
  var vals = sheet.getDataRange().getDisplayValues();
  var slots = [];
  if (!vals.length) return slots;

  var numCols = vals[0].length;
  for (var c = 0; c < numCols; c++) {
    var currentDate = null;
    for (var r = 0; r < vals.length; r++) {
      var cell = String(vals[r][c]).trim();
      if (!cell) continue; // blank rows between dates: ignored

      if (DATE_RX.test(cell)) {
        var key = toIso(cell);
        currentDate = key ? { key: key, label: cell } : null;
      } else if (currentDate && TIME_RX.test(cell)) {
        var status = String((vals[r][c + 1] !== undefined ? vals[r][c + 1] : '')).trim().toUpperCase();
        slots.push({
          dateKey: currentDate.key,
          dateLabel: currentDate.label,
          time: normTime(cell),
          status: status,
          row: r + 1,      // 1-indexed
          col: c + 2       // status cell = column right of the time cell, 1-indexed
        });
      }
      // Headers (venue, address, month label) match neither regex: ignored.
    }
  }
  return slots;
}

/** "Aug 11, 2026" to "2026-08-11". Returns '' if unparseable. */
function toIso(label) {
  var m = label.match(/^([A-Za-z]{3,9})\.? (\d{1,2}), (\d{4})$/);
  if (!m) return '';
  var mon = MONTHS[m[1].slice(0, 3).toUpperCase()];
  if (!mon) return '';
  var day = parseInt(m[2], 10);
  if (day < 1 || day > 31) return '';
  return m[3] + '-' + pad2(mon) + '-' + pad2(day);
}

/** "1:00pm", " 1:00 PM " etc to "1:00 PM". */
function normTime(t) {
  var s = String(t).trim().toUpperCase().replace(/\s+/g, ' ');
  var m = s.match(/^(\d{1,2}):(\d{2})\s?([AP]M)$/);
  if (!m) return s;
  return String(parseInt(m[1], 10)) + ':' + m[2] + ' ' + m[3];
}

function pad2(n) {
  return (n < 10 ? '0' : '') + n;
}

function findSlot(slots, dateKey, time) {
  for (var i = 0; i < slots.length; i++) {
    if (slots[i].dateKey === dateKey && slots[i].time === time) return slots[i];
  }
  return null;
}

/** Groups scanned slots into the GET response shape, past dates dropped. */
function buildSchedule(slots) {
  var todayKey = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  var byDate = {};
  var order = [];

  for (var i = 0; i < slots.length; i++) {
    var s = slots[i];
    if (s.dateKey < todayKey) continue; // string compare works on yyyy-mm-dd
    if (!byDate[s.dateKey]) {
      byDate[s.dateKey] = { date: s.dateKey, label: s.dateLabel, slots: [] };
      order.push(s.dateKey);
    }
    byDate[s.dateKey].slots.push({ time: s.time, status: s.status });
  }

  order.sort();
  var days = [];
  for (var j = 0; j < order.length; j++) days.push(byDate[order[j]]);

  return {
    ok: true,
    generatedAt: Utilities.formatDate(new Date(), 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    venue: VENUE,
    days: days
  };
}

function getScheduleSheet(ss) {
  if (SCHEDULE_SHEET_NAME) {
    var named = ss.getSheetByName(SCHEDULE_SHEET_NAME);
    if (named) return named;
  }
  return ss.getSheets()[0];
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Accepts date as sheet label ("Aug 11, 2026") or ISO ("2026-08-11").
 * Accepts note under "note" or "notes". Phone must be 10 or 11 digits.
 */
function validate(req) {
  if (!req || req.action !== 'reserve') return { ok: false };

  var name = String(req.name || '').trim();
  if (name.length < 2 || name.length > 60) return { ok: false };

  var phone = String(req.phone || '').replace(/\D/g, '');
  if (phone.length < 10 || phone.length > 11) return { ok: false };

  var rawDate = String(req.date || '').trim();
  var dateKey = '';
  var dateLabel = rawDate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    dateKey = rawDate;
  } else if (DATE_RX.test(rawDate)) {
    dateKey = toIso(rawDate);
  }
  if (!dateKey) return { ok: false };

  var time = normTime(String(req.time || ''));
  if (!TIME_RX.test(time)) return { ok: false };

  var note = String(req.note || req.notes || '').trim().slice(0, 300);

  return { ok: true, name: name, phone: phone, dateKey: dateKey, dateLabel: dateLabel, time: time, note: note };
}

// ---------------------------------------------------------------------------
// Requests tab
// ---------------------------------------------------------------------------

var REQUESTS_HEADER = ['Timestamp', 'Date', 'Time', 'Name', 'Phone', 'Note', 'Result', 'CellRef', 'EmailStatus'];

function getRequestsSheet(ss) {
  var sheet = ss.getSheetByName(REQUESTS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(REQUESTS_SHEET_NAME);
    sheet.appendRow(REQUESTS_HEADER);
  }
  return sheet;
}

/** Appends the request row. Returns {sheet, row} so EmailStatus can be set later. */
function logRequest(ss, v, slot) {
  var sheet = getRequestsSheet(ss);
  var cellRef = slot.dateLabel + ' ' + slot.time + ' R' + slot.row + 'C' + slot.col;
  sheet.appendRow([
    Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'),
    v.dateKey, v.time, v.name, v.phone, v.note, STATUS_PENDING, cellRef, ''
  ]);
  return { sheet: sheet, row: sheet.getLastRow() };
}

/** True if the Requests log shows this same phone already requested this slot. */
function samePhonePending(ss, v) {
  var rows = requestRows(ss);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][1] === v.dateKey && rows[i][2] === v.time &&
        String(rows[i][4]) === v.phone && rows[i][6] === STATUS_PENDING) {
      return true;
    }
  }
  return false;
}

/**
 * Counts distinct slots this phone has requested that are STILL pending on the
 * schedule tab. Old requests whose slots Mike already flipped to BOOKED or
 * OPEN do not count against the cap.
 */
function pendingCountForPhone(ss, slots, phone) {
  var rows = requestRows(ss);
  var seen = {};
  var count = 0;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][4]) !== phone || rows[i][6] !== STATUS_PENDING) continue;
    var key = rows[i][1] + '|' + rows[i][2];
    if (seen[key]) continue;
    var slot = findSlot(slots, String(rows[i][1]), String(rows[i][2]));
    if (slot && slot.status === STATUS_PENDING) {
      seen[key] = true;
      count++;
    }
  }
  return count;
}

function requestRows(ss) {
  var sheet = ss.getSheetByName(REQUESTS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, REQUESTS_HEADER.length).getDisplayValues();
}

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

function notifyMike(v) {
  var body = 'Lesson request\n\n' +
    'When: ' + v.dateLabel + ' at ' + v.time + '\n' +
    'Name: ' + v.name + '\n' +
    'Phone: ' + v.phone +
    (v.note ? '\nNote: ' + v.note : '') + '\n\n' +
    'The slot is marked PENDING in your sheet.\n' +
    'Change it to BOOKED to confirm, or back to OPEN to pass.\n' +
    'Text ' + v.phone + ' either way so they know.';

  MailApp.sendEmail({
    to: MIKE_EMAIL,
    subject: 'Lesson request: ' + v.dateLabel + ' ' + v.time + ' - ' + v.name,
    body: body
  });

  if (SMS_GATEWAY) {
    try {
      MailApp.sendEmail({
        to: SMS_GATEWAY,
        subject: '',
        body: v.dateLabel + ' ' + v.time + ' ' + v.name + ' ' + v.phone
      });
    } catch (gatewayErr) {
      // Best effort only. Carrier gateways are dying; never load-bearing.
    }
  }
}

// ---------------------------------------------------------------------------
// Output helper
// ---------------------------------------------------------------------------

function jsonOut(bodyString) {
  return ContentService.createTextOutput(bodyString)
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// Manual test helpers (run from the Apps Script editor, never called by HTTP)
// ---------------------------------------------------------------------------

/** Run once after pasting: logs every parsed slot. Eyeball against the sheet,
 *  especially the misaligned late-month blocks. Also walks the OAuth consent. */
function testScan() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var slots = scan(getScheduleSheet(ss));
  Logger.log('Parsed %s slots', slots.length);
  for (var i = 0; i < slots.length; i++) {
    var s = slots[i];
    Logger.log('%s %s [%s] R%sC%s', s.dateKey, s.time, s.status, s.row, s.col);
  }
}

/** Dry email send to Chris first; switch the address to confirm Mike delivery. */
function testEmail() {
  notifyMike({
    dateLabel: 'Aug 11, 2026', time: '1:00 PM',
    name: 'Test Person', phone: '7025550000', note: 'dry run, ignore'
  });
}
