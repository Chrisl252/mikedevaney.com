# Site integration spec: booking backend hook

Mechanical edit spec for `index.html` (apply to the canonical repo copy, then build/deploy as usual). Do not restructure anything else. All new copy obeys the site rules: no em or en dashes, dark green and gold theme, no payment talk, no "text or call" phrasing, SMS stays the primary path. The backend is purely additive: with `BOOKING_API` empty the site behaves byte-for-byte like today.

Anchor names below refer to the existing inline script in `index.html` (the IIFE starting `(function(){ "use strict";`).

## 1. Config constant

Directly under the existing `var SHEET_CSV = ...` line, add:

```js
var BOOKING_API = "";  // Apps Script /exec URL. Empty string = dormant, CSV-only site.
```

## 2. Slot model gains one flag

The site slot object is `{time, open}`. Add a third field `held` (true when the backend reports PENDING). CSV-parsed slots never set it, so nothing changes in dormant mode.

In `extractDays` leave everything as is (CSV has no PENDING).

## 3. API loader tier

Add these two functions after `extractDays`:

```js
function apiDaysToList(data){
  var list=(data.days||[]).map(function(d){
    return { date:d.label, ts:Date.parse(d.label),
      slots:(d.slots||[]).map(function(s){
        return { time:s.time, open:s.status==="OPEN", held:s.status==="PENDING" };
      }) };
  }).filter(function(d){ return d.slots.length&&!isNaN(d.ts); });
  list.sort(function(a,b){ return a.ts-b.ts; });
  return list;
}
function fetchApiSchedule(){
  if(!BOOKING_API) return Promise.reject(new Error("dormant"));
  var ctl=new AbortController();
  var t=setTimeout(function(){ ctl.abort(); },5000);
  return fetch(BOOKING_API,{signal:ctl.signal})
    .then(function(res){ return res.json(); })   // HTML login page or non JSON throws here: the tripwire
    .then(function(data){
      clearTimeout(t);
      if(!data||data.ok!==true) throw new Error("bad payload");
      return apiDaysToList(data);
    })
    .catch(function(err){ clearTimeout(t); throw err; });
}
```

## 4. Tiered load

In `loadSchedule(force)`, replace the single line

```js
    fetch(SHEET_CSV+"&cb="+Date.now(),{cache:force?"no-store":"default"})
      .then(function(res){ if(!res.ok) throw new Error("HTTP "+res.status); return res.text(); })
      .then(function(text){
        var list=extractDays(parseCSV(text));
```

with

```js
    fetchApiSchedule()
      .then(function(list){ apiLive=true; return list; })
      .catch(function(){
        apiLive=false;
        return fetch(SHEET_CSV+"&cb="+Date.now(),{cache:force?"no-store":"default"})
          .then(function(res){ if(!res.ok) throw new Error("HTTP "+res.status); return res.text(); })
          .then(function(text){ return extractDays(parseCSV(text)); });
      })
      .then(function(list){
```

and declare `var apiLive=false;` next to the existing `var PAGE_SIZE=5, page=0, dayList=[];` line. Everything already inside the success handler (`clearSel(); dayList=list; ...`) stays unchanged; only the promise head changes. The existing `.catch` at the bottom of `loadSchedule` remains the tier 3 static fallback and needs no edit. Result: dead or misconfigured backend is invisible, the site simply runs today's CSV path.

## 5. Held slots render as non-clickable

In `slotButton(day,s,tag)`, change the first three lines from

```js
    var el=document.createElement(s.open?"button":"span");
    el.className=tag+(s.open?"":" booked");
    el.textContent=(tag==="chip")?s.time:(s.open?"Open":"Booked");
```

to

```js
    var el=document.createElement(s.open?"button":"span");
    el.className=tag+(s.open?"":(s.held?" held":" booked"));
    el.textContent=(tag==="chip")?s.time:(s.open?"Open":(s.held?"Held":"Booked"));
```

In `renderAgenda`, in the non-interactive branch, change

```js
          el.className="chip"+(s.open?"":" booked");
```

to

```js
          el.className="chip"+(s.open?"":(s.held?" held":" booked"));
```

Add CSS next to the existing `.slot.booked` rule:

```css
.slot.held,.chip.held{cursor:default;color:var(--gold,#c9a45c);opacity:.75;font-style:italic}
```

(If the stylesheet uses a different gold variable name, reuse whatever `.slot:hover` references, currently `rgba(201,164,92,...)`.)

## 6. Booking bar gains the Reserve flow

The bar today is `#bookbar` with `#bbWhen`, `#bbLink` (SMS link), `#bbCancel`. Add inside `#bookbar`, after the `#bbLink` element:

```html
<button type="button" id="bbReserve" class="bb-reserve">Reserve this time</button>
<form id="bbForm" class="bb-form" hidden>
  <input id="bbName" type="text" maxlength="60" autocomplete="name" placeholder="Your name" required>
  <input id="bbPhone" type="tel" maxlength="14" autocomplete="tel" placeholder="Your phone" required>
  <input id="bbHp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">
  <button type="submit" id="bbSend" class="bb-reserve">Hold it</button>
</form>
<div id="bbMsg" class="bb-msg" hidden></div>
```

`#bbHp` is the honeypot: visually offscreen, never labeled, sent as `hp`. Humans leave it empty.

CSS (match the bar's existing look; gold button on dark green):

```css
.bb-reserve{font:600 14px var(--sans);background:var(--gold,#c9a45c);color:#14211a;border:none;border-radius:6px;padding:8px 14px;cursor:pointer}
.bb-reserve[disabled]{opacity:.5;cursor:default}
.bb-form{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.bb-form input{font:14px var(--sans);padding:8px;border-radius:6px;border:1px solid rgba(201,164,92,.4);background:var(--cell);color:var(--ink)}
.bb-msg{font:14px var(--sans);margin-top:8px;color:var(--ink)}
```

## 7. Reserve flow JS

Add after the `document.getElementById("bbCancel")...` line:

```js
  var bbReserve=document.getElementById("bbReserve");
  var bbForm=document.getElementById("bbForm");
  var bbMsg=document.getElementById("bbMsg");
  function resetBookbarExtras(){
    bbReserve.hidden=!apiLive; bbReserve.disabled=false;
    bbForm.hidden=true; bbMsg.hidden=true; bbMsg.textContent="";
  }
  bbReserve.addEventListener("click",function(){
    bbReserve.hidden=true; bbForm.hidden=false;
    document.getElementById("bbName").focus();
  });
  bbForm.addEventListener("submit",function(ev){
    ev.preventDefault();
    if(!sel) return;
    var name=document.getElementById("bbName").value.trim();
    var phone=document.getElementById("bbPhone").value.replace(/\D/g,"");
    if(name.length<2||phone.length<10){ bbMsg.hidden=false; bbMsg.textContent="Add your name and a 10 digit phone number."; return; }
    var send=document.getElementById("bbSend");
    send.disabled=true;                                  // double tap guard
    var payload={action:"reserve",date:sel.date,time:sel.time,name:name,phone:phone,
                 note:"",hp:document.getElementById("bbHp").value};
    var when=shortDate(sel.date)+" at "+sel.time;
    fetch(BOOKING_API,{method:"POST",body:JSON.stringify(payload)})  // no headers object AT ALL (CORS simple request)
      .then(function(r){ return r.json(); })
      .then(function(res){
        if(res.ok){
          bbForm.hidden=true; bbMsg.hidden=false;
          bbMsg.textContent="Got it. That time is on hold. Mike will text you to lock it in.";
          loadSchedule(true);                            // repaint, slot now shows Held
        }else if(res.error==="TAKEN"){
          bbForm.hidden=true; bbMsg.hidden=false;
          bbMsg.textContent="That time just went. Pick another open time.";
          loadSchedule(true);
        }else{
          reserveFallback(when,name);
        }
      })
      .catch(function(){ reserveFallback(when,name); })
      .then(function(){ send.disabled=false; });
  });
  function reserveFallback(when,name){
    // Any non TAKEN failure (LOCKED, network, parse): finish the same booking over SMS, zero retyping.
    bbForm.hidden=true; bbMsg.hidden=false; bbMsg.textContent="";
    var a=document.createElement("a");
    a.href=smsHref("Hi Mike, I'd like to book a lesson on "+when+". My name is "+name+".");
    a.textContent="Text Mike to book "+when;
    bbMsg.appendChild(document.createTextNode("Could not hold it online. "));
    bbMsg.appendChild(a);
  }
```

Wire the reset into the existing bar lifecycle:

- In `pickSlot`, after `bookbar.classList.add("on");` add `resetBookbarExtras();`
- In `clearSel`, add `if(bbReserve){resetBookbarExtras(); bbReserve.hidden=true;}` as its last line (guarded so it is safe before DOM ready ordering issues).

Because `resetBookbarExtras` shows the Reserve button only when `apiLive` is true, the button never renders on the CSV tier or in dormant mode; the SMS link `#bbLink` is untouched and always present, so SMS stays the primary CTA on every surface.

## 8. Acceptance checklist for whoever applies this

1. `BOOKING_API=""`: site is functionally identical to today. No Reserve button anywhere, CSV loads, SMS booking works.
2. `BOOKING_API` set, backend up: schedule loads from the API (network tab shows the /exec call, no CSV call), PENDING slots show as Held and are not clickable, picking an open slot shows both the SMS link and Reserve this time.
3. Reserve happy path: form, submit, confirmation copy exactly "Got it. That time is on hold. Mike will text you to lock it in.", slot repaints as Held.
4. Race: reserve a slot already taken in another tab, expect "That time just went. Pick another open time." and a repaint.
5. Kill the backend URL (typo it): site silently drops to CSV, no console-driven UI breakage, no spinner stuck.
6. Grep the final diff for the two forbidden dash characters (U+2013, U+2014): zero hits. Confirm no new copy says anything about payment and nothing reads "text or call".
