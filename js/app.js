// TimeStamper UI: Log, Review and Settings screens (docs/spec.md).

import { hhmm, dateStr, abbr, offset, offsetMs, parts, zonedToUtc, zoneName, zoneList, pad, phoneZone } from './time.js';
import * as M from './model.js';
import { load, save, requestPersistence } from './store.js';

const PALETTES = [
  { key: 'auto', name: 'Match phone', desc: 'Graphite E-Ink when the phone is in light mode, Amber Instrument in dark mode.', sw: [['#e8e8e4', '#111111'], ['#120e08', '#ffb000']] },
  { key: 'graphite', name: 'Graphite E-Ink', desc: 'Grey and monochrome. Glare-resistant on bright screens.', sw: [['#e8e8e4', '#111111']] },
  { key: 'amber', name: 'Amber Instrument', desc: 'Amber on near-black. A dim cab at night, unaided eyes.', sw: [['#120e08', '#ffb000']] },
  { key: 'sunlight', name: 'Sunlight', desc: 'Maximum contrast for ramps, helipads and direct sun. Turn brightness up.', sw: [['#ffffff', '#000000']] },
  { key: 'night', name: 'Night (red)', desc: 'Protects unaided night vision. Never under NVGs: red blooms in goggles.', sw: [['#000000', '#e0392b']] },
  { key: 'nvg', name: 'NVG (green)', desc: 'Dim green on black for use under goggles. Set brightness to minimum.', sw: [['#000000', '#3b9a48']] },
];

const ICON = {
  log: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  review: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
};

// ---------- State ----------
const S = load();
// UI-only state, never stored.
const U = { screen: 'log', reviewTab: 'case', reviewId: S.activeId, draftOp: '', draftNote: '', error: '', sheet: null, storage: 'unknown', version: '' };
let installEvent = null;

function commit() {
  if (!save(S)) toast('Could not save to this phone. Storage may be full.', 5000);
}

// ---------- Helpers ----------
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sameOffset = (t, a, b) => offsetMs(t, a) === offsetMs(t, b);
const clockTz = () => M.activeCase(S)?.tz || phoneZone();
const reviewCase = () => M.caseById(S, U.reviewId) || M.activeCase(S) || S.cases[0] || null;
const marks = e => (e.edited ? ' <span class="badge">Edited</span>' : '') + (e.late ? ' <span class="badge">Added</span>' : '');
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const ago = ms => { const m = Math.round(ms / 60000), h = Math.floor(m / 60); return h ? `${h} h ${m % 60} min` : `${m} min`; };

function installText() {
  if (isIOS()) return 'In Safari, tap Share, then <strong>Add to Home Screen</strong>. Opening it from the home screen keeps your log from being cleared.';
  if (installEvent) return 'Install it so your log is kept on this phone and opens like an app.';
  return 'Open the browser menu (⋮) and tap <strong>Install app</strong> or <strong>Add to Home screen</strong>. This keeps your log from being cleared.';
}

function paletteNotice() {
  if (S.palette === 'nvg') return '<p class="notice">Set screen brightness to minimum. Phone screens are not NVIS-certified: check this under goggles on the ground before flying with it.</p>';
  if (S.palette === 'night') return '<p class="notice">Red is for unaided eyes. Switch to NVG before putting goggles on.</p>';
  return '';
}

function clockSub() {
  const c = M.activeCase(S), t = Date.now(), pz = phoneZone();
  if (!c) return `No open case. Saving starts one in ${abbr(t, pz)}.`;
  return sameOffset(t, c.tz, pz) ? 'Case time zone' : `Case time zone · phone shows ${hhmm(t, pz)} ${abbr(t, pz)}`;
}

// ---------- Screens ----------
function logScreen() {
  const c = M.activeCase(S), now = Date.now();
  const install = !isStandalone() && !S.installDismissed
    ? `<div class="install"><p><strong>Install TimeStamper.</strong> ${installText()}</p>${installEvent
      ? '<button class="btn small primary" data-act="install">Install</button>' : ''}<button class="btn small" data-act="dismiss-install">Got it</button></div>` : '';
  const line = c
    ? `<p><strong>${esc(M.caseName(c))}</strong><br>Started <span class="mono">${hhmm(M.startOf(c), c.tz)}</span> ${abbr(M.startOf(c), c.tz)}</p><button class="btn small" data-act="new-case">New case</button>`
    : '<p><strong>No open case</strong><br>Your next save starts one.</p>';
  return `<div class="log gutter">
    ${install}${paletteNotice()}
    <div class="caseline">${line}</div>
    <div class="inputs">
      <div class="select-wrap"><select class="field" id="op" data-bind="draftOp" aria-label="Operation"><option value="">Operation…</option>${S.ops.map(o => `<option ${U.draftOp === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>
      <textarea class="field" id="note" data-bind="draftNote" placeholder="Times &amp; events only, no patient identifiers" aria-label="Note">${esc(U.draftNote)}</textarea>
    </div>
    <p class="err" role="alert">${esc(U.error)}</p>
    <button class="save" data-act="save" aria-label="Save entry at the current time">
      <span class="t" data-clock="t">${hhmm(now, clockTz())}</span>
      <span class="z" data-clock="z">${abbr(now, clockTz())}</span>
      <span class="sub" data-clock="sub">${clockSub()}</span>
      <span class="cta">Tap to save</span></button></div>`;
}

function reviewScreen() {
  const tabs = `<div class="segtabs" role="group" aria-label="Review view"><button data-act="rtab" data-v="case" aria-pressed="${U.reviewTab === 'case'}">This case</button><button data-act="rtab" data-v="all" aria-pressed="${U.reviewTab === 'all'}">All cases</button></div>`;
  const none = '<p class="empty">No cases yet. Save an entry on the Log tab to start one.</p>';
  if (U.reviewTab === 'all') {
    const list = S.cases.map(x => { const st = M.startOf(x); return `<li><button data-act="open-case" data-v="${x.id}">
      <span class="nm">${esc(M.caseName(x))}${x.id === S.activeId ? ' <span class="badge">Active</span>' : ''}</span>
      <span class="sm"><span class="mono">${dateStr(st, x.tz)} ${hhmm(st, x.tz)}</span> ${abbr(st, x.tz)} · ${x.entries.length} ${x.entries.length === 1 ? 'entry' : 'entries'}</span></button></li>`; }).join('');
    return `<div class="rv gutter">${tabs}${S.cases.length ? `<ul class="cases">${list}</ul>` : none}</div>`;
  }
  const c = reviewCase();
  if (!c) return `<div class="rv gutter">${tabs}${none}</div>`;
  const st = M.startOf(c);
  const timeline = c.entries.length
    ? `<ul class="tl">${M.groupByDay(c).map(g => `<li class="dayrow"><h2 class="day">${g.day}</h2></li>` + g.items.map(e => `<li><button data-act="edit" data-v="${e.id}" aria-label="Edit entry at ${hhmm(e.t, c.tz)}">
      <span class="t mono">${hhmm(e.t, c.tz)}</span><span class="dot"></span>
      <span><span class="op">${esc(e.op || e.note)}</span>${marks(e)}${e.op && e.note ? `<span class="note">${esc(e.note)}</span>` : ''}</span></button></li>`).join('')).join('')}</ul>`
    : '<p class="empty">No entries in this case.</p>';
  return `<div class="rv gutter">${tabs}
    <div class="rv-head"><h1>${esc(M.caseName(c))}</h1><div class="meta">
      ${c.id === S.activeId ? '<span class="badge">Active</span>' : ''}<span>Started ${dateStr(st, c.tz)}</span>
      <button class="tzchip" data-act="edit-tz" aria-label="Change case time zone">${abbr(st, c.tz)} · ${esc(zoneName(c.tz))} ✎</button>
      <button class="tzchip" data-act="rename" aria-label="Rename case">Rename ✎</button></div></div>
    ${timeline}
    <div class="actions"><button class="btn small" data-act="copy" ${c.entries.length ? '' : 'disabled'}>Copy Log</button><button class="btn small" data-act="late">Add Entry</button><button class="btn small danger" data-act="del-case">Delete Case</button></div></div>`;
}

function settingsScreen() {
  const swatch = p => p.sw.length > 1
    ? `<span class="sw split">${p.sw.map(([b, f]) => `<span style="background:${b};color:${f}">Aa</span>`).join('')}</span>`
    : `<span class="sw" style="background:${p.sw[0][0]};color:${p.sw[0][1]}">14:07</span>`;
  const storage = { granted: 'Protected: the browser has agreed not to clear it.', denied: 'Not guaranteed yet. Installing to the home screen protects it.', unsupported: 'Not guaranteed. Installing to the home screen protects it.', unknown: 'Checking…' }[U.storage];
  return `<div class="st gutter"><h1>Settings</h1>
  <p class="version">Version <span class="mono">${esc(U.version || 'not installed')}</span></p>
  ${paletteNotice()}
  <section><h2 class="label">Appearance</h2><ul class="pal">${PALETTES.map(p => `<li><button data-act="palette" data-v="${p.key}" aria-pressed="${S.palette === p.key}">
    ${swatch(p)}<span><span class="nm">${p.name}</span><span class="ds">${p.desc}</span></span></button></li>`).join('')}</ul></section>
  <section><h2 class="label">Operations</h2>
    <ul class="ops">${S.ops.map((o, i) => `<li><input class="field" id="op-${i}" data-rename="${i}" value="${esc(o)}" aria-label="Operation name">
      <button class="btn small" data-act="op-up" data-v="${i}" aria-label="Move ${esc(o)} up" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button class="btn small" data-act="op-down" data-v="${i}" aria-label="Move ${esc(o)} down" ${i === S.ops.length - 1 ? 'disabled' : ''}>↓</button>
      <button class="btn small danger" data-act="op-del" data-v="${i}" aria-label="Remove ${esc(o)}">✕</button></li>`).join('')}</ul>
    <div class="addrow"><input class="field" id="new-op" placeholder="New operation" aria-label="New operation" enterkeyhint="done"><button class="btn primary" data-act="op-add">Add</button></div>
    <button class="btn small" data-act="op-reset">Restore default operations</button></section>
  <section><h2 class="label">Privacy</h2><div class="warn"><strong>Times and events only.</strong>Don't enter patient names or other identifying details. Entries stay on this phone and in anything you copy them into.</div></section>
  <section><h2 class="label">This phone</h2>
    <p>Your log is stored only on this phone, in this browser. ${storage}</p>
    ${isStandalone() ? '<p class="fine">Running from the home screen.</p>' : `<p class="fine">${installText()}</p>${installEvent ? '<button class="btn primary" data-act="install">Install TimeStamper</button>' : ''}`}
    <p class="fine">Use Copy log on the Review page to keep a copy anywhere else.</p></section>
  </div>`;
}

// ---------- Sheets ----------
const confirmSheet = (title, text, yes, onYes, danger = true) => openSheet({ kind: 'confirm', title, text, yes, onYes, danger });

function sheetHtml() {
  const o = U.sheet; if (!o) return '';
  let body = '';
  if (o.kind === 'confirm') {
    body = `<h2 id="sheet-title">${esc(o.title)}</h2><p>${esc(o.text)}</p>
      <div class="row"><button class="btn" data-act="close">Cancel</button><button class="btn ${o.danger ? 'danger' : 'primary'}" data-act="confirm-yes">${esc(o.yes)}</button></div>`;
  } else if (o.kind === 'stale') {
    const c = M.activeCase(S);
    body = `<h2 id="sheet-title">Start a new case?</h2>
      <p>Nothing has been saved to <strong>${esc(M.caseName(c))}</strong> for ${ago(o.now - M.lastActivity(c))}. This entry is stamped <span class="mono">${hhmm(o.now, phoneZone())}</span> ${abbr(o.now, phoneZone())}.</p>
      <div class="stack"><button class="btn primary" data-act="stale-new">Start new case</button><button class="btn" data-act="stale-same">Add to ${esc(M.caseName(c))}</button><button class="btn link" data-act="close">Cancel, don't save</button></div>`;
  } else if (o.kind === 'entry') {
    const c = M.caseById(S, o.caseId), e = o.entryId ? c.entries.find(x => x.id === o.entryId) : null;
    const t = e ? e.t : Date.now(), p = parts(t, c.tz);
    const ops = e && e.op && !S.ops.includes(e.op) ? [e.op, ...S.ops] : S.ops;
    body = `<h2 id="sheet-title" tabindex="-1">${e ? 'Edit entry' : 'Add Entry'}</h2>
      <div class="row"><div><label class="label" for="ov-date">Date</label><input class="field" type="date" id="ov-date" value="${p.y}-${pad(p.mo)}-${pad(p.d)}"></div>
      <div><label class="label" for="ov-time">Time (${abbr(t, c.tz)})</label><input class="field mono" type="time" id="ov-time" value="${pad(p.h)}:${pad(p.mi)}"></div></div>
      <div><label class="label" for="ov-op">Operation</label><div class="select-wrap"><select class="field" id="ov-op"><option value="">None</option>${ops.map(x => `<option ${e && e.op === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div></div>
      <div><label class="label" for="ov-note">Note</label><textarea class="field" id="ov-note" placeholder="Times &amp; events only, no patient identifiers">${esc(e ? e.note : '')}</textarea></div>
      <p class="fine">${e ? `Originally saved <span class="mono">${hhmm(e.orig, c.tz)}</span> ${abbr(e.orig, c.tz)}, ${dateStr(e.orig, c.tz)}${e.edited ? ' · edited since' : ''}` : `Times are in the case time zone, ${esc(zoneName(c.tz))}. Added entries are marked.`}</p>
      <p class="err" id="ov-err" role="alert"></p>
      <div class="row">${e ? '<button class="btn danger" data-act="del-entry">Delete</button>' : ''}<button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="entry-save">${e ? 'Save changes' : 'Add entry'}</button></div>`;
  } else if (o.kind === 'tz') {
    const c = M.caseById(S, o.caseId), now = Date.now(), { common, rest } = zoneList(c.tz);
    const opt = z => `<option value="${z}" ${z === c.tz ? 'selected' : ''}>${esc(zoneName(z))} (${abbr(now, z)}, ${offset(now, z)})</option>`;
    const extra = [c.tz, phoneZone()].filter((z, i, a) => !common.includes(z) && a.indexOf(z) === i);
    body = `<h2 id="sheet-title">Case time zone</h2><p>Every entry in this case is shown in this zone. Changing it changes how times display; the saved moments stay the same.</p>
      <div class="select-wrap"><select class="field" id="ov-tz" aria-label="Time zone">
        <optgroup label="Common">${[...extra, ...common].map(opt).join('')}</optgroup>
        ${rest.length ? `<optgroup label="All zones">${rest.filter(z => !extra.includes(z)).map(opt).join('')}</optgroup>` : ''}</select></div>
      <div class="row"><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="tz-save">Use this zone</button></div>`;
  } else if (o.kind === 'rename') {
    const c = M.caseById(S, o.caseId);
    body = `<h2 id="sheet-title">Rename case</h2><input class="field" id="ov-name" value="${esc(c.name)}" placeholder="${esc(M.caseName({ ...c, name: '' }))}" aria-label="Case name" enterkeyhint="done">
      <p class="fine">Leave blank to use the start date.</p>
      <div class="row"><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="rename-save">Save name</button></div>`;
  } else if (o.kind === 'copy') {
    body = `<h2 id="sheet-title">Copy this log</h2><p>Copying was blocked. Press and hold the text to select it.</p><pre>${esc(o.text)}</pre>
      <div class="row"><button class="btn primary" data-act="close">Done</button></div>`;
  }
  return `<div class="scrim" data-act="scrim"><div class="sheet gutter" role="dialog" aria-modal="true" aria-labelledby="sheet-title">${body}</div></div>`;
}

function openSheet(o) {
  U.sheet = o;
  render();
  // The entry sheet focuses its heading: focusing the date field opens the phone's date picker.
  if (o.kind === 'entry') document.getElementById('sheet-title').focus({ preventScroll: true });
  else app.querySelector('.sheet input, .sheet select, .sheet textarea, .sheet button')?.focus({ preventScroll: true });
}
function closeSheet() { U.sheet = null; render(); }

// ---------- Render ----------
const app = document.getElementById('app');
const SCREENS = { log: logScreen, review: reviewScreen, settings: settingsScreen };

function render() {
  const keepScroll = app.querySelector('.screen')?.dataset.screen === U.screen ? app.querySelector('.screen').scrollTop : 0;
  const focusId = document.activeElement?.id;
  const tabs = [['log', 'Log'], ['review', 'Review'], ['settings', 'Settings']].map(([k, l]) =>
    `<button data-act="tab" data-v="${k}" ${U.screen === k ? 'aria-current="page"' : ''}>${ICON[k]}${l}</button>`).join('');
  app.innerHTML = `<main class="screen" data-screen="${U.screen}">${SCREENS[U.screen]()}</main><nav class="tabs" aria-label="Main">${tabs}</nav>${sheetHtml()}`;
  app.querySelector('.screen').scrollTop = keepScroll;
  if (focusId && !U.sheet) document.getElementById(focusId)?.focus({ preventScroll: true });
}

function tick() {
  const now = Date.now(), tz = clockTz();
  for (const [k, v] of [['t', hhmm(now, tz)], ['z', abbr(now, tz)], ['sub', clockSub()]]) {
    const n = app.querySelector(`[data-clock="${k}"]`);
    if (n && n.textContent !== v) n.textContent = v;
  }
}
setInterval(tick, 1000);

const toastEl = document.getElementById('toast');
let toastTimer;
function toast(msg, ms = 2200) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, ms);
}

function applyPalette() {
  const root = document.documentElement;
  if (S.palette === 'auto') root.removeAttribute('data-palette'); else root.setAttribute('data-palette', S.palette);
  const bg = getComputedStyle(root).getPropertyValue('--band-bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || '#111111');
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyPalette);

// ---------- Actions ----------
function doSave(now, newCase) {
  const pz = phoneZone();
  let r;
  try { r = M.saveEntry(S, { op: U.draftOp, note: U.draftNote, now, phoneTz: pz, newCase }); }
  catch (err) { U.error = err.message; return render(); }
  commit();
  U.draftOp = ''; U.draftNote = ''; U.error = ''; U.reviewId = r.c.id; U.sheet = null;
  render();
  toast(`Saved ${hhmm(now, r.c.tz)} ${abbr(now, r.c.tz)}`);
  if (U.storage !== 'granted') requestPersistence().then(v => { U.storage = v; });
}

/** `prev` is the entry being edited: if its date and time fields were left alone, its exact instant (with seconds) is kept. */
function readEntrySheet(c, prev) {
  const err = m => { document.getElementById('ov-err').textContent = m; return null; };
  const dateV = document.getElementById('ov-date').value, timeV = document.getElementById('ov-time').value;
  const [y, mo, d] = dateV.split('-').map(Number);
  const [h, mi] = timeV.split(':').map(Number);
  const op = document.getElementById('ov-op').value, note = document.getElementById('ov-note').value;
  if ([y, mo, d, h, mi].some(n => !Number.isFinite(n))) return err('Enter a full date and time.');
  if (!M.isEntryValid(op, note)) return err('Pick an operation or type a note.');
  if (prev) {
    const p = parts(prev.t, c.tz);
    if (dateV === `${p.y}-${pad(p.mo)}-${pad(p.d)}` && timeV === `${pad(p.h)}:${pad(p.mi)}`) return { t: prev.t, op, note };
  }
  return { t: zonedToUtc(y, mo, d, h, mi, c.tz), op, note };
}

async function copyLog(c) {
  const text = M.logText(c);
  try { await navigator.clipboard.writeText(text); toast('Case log copied'); }
  catch { openSheet({ kind: 'copy', text }); }
}

const actions = {
  tab(v) { U.screen = v; if (v === 'review') U.reviewId = U.reviewId && M.caseById(S, U.reviewId) ? U.reviewId : S.activeId; render(); },
  'dismiss-install'() { S.installDismissed = true; commit(); render(); },
  async install() { if (!installEvent) return; installEvent.prompt(); await installEvent.userChoice; installEvent = null; render(); },
  save() {
    const now = Date.now();
    if (!M.isEntryValid(U.draftOp, U.draftNote)) { U.error = 'Pick an operation or type a note.'; return render(); }
    if (M.isStale(S, now)) return openSheet({ kind: 'stale', now });
    doSave(now, false);
  },
  'stale-new'() { doSave(U.sheet.now, true); },
  'stale-same'() { doSave(U.sheet.now, false); },
  'new-case'() {
    confirmSheet('Close this case?', `It stays on the Review page. Your next save starts a new case in ${abbr(Date.now(), phoneZone())}, this phone's current zone.`, 'Close case',
      () => { M.closeActive(S); commit(); render(); toast('Case closed'); }, false);
  },
  rtab(v) { U.reviewTab = v; render(); },
  'open-case'(v) { U.reviewId = v; U.reviewTab = 'case'; render(); app.querySelector('.screen').scrollTop = 0; },
  edit(v) { openSheet({ kind: 'entry', caseId: reviewCase().id, entryId: v }); },
  late() { openSheet({ kind: 'entry', caseId: reviewCase().id, entryId: null }); },
  'edit-tz'() { openSheet({ kind: 'tz', caseId: reviewCase().id }); },
  rename() { openSheet({ kind: 'rename', caseId: reviewCase().id }); },
  close: closeSheet,
  scrim: closeSheet,
  'confirm-yes'() { const f = U.sheet.onYes; U.sheet = null; f(); },
  'entry-save'() {
    const o = U.sheet, c = M.caseById(S, o.caseId), v = readEntrySheet(c, o.entryId && c.entries.find(x => x.id === o.entryId));
    if (!v) return;
    if (o.entryId) {
      const changed = M.editEntry(S, c.id, o.entryId, v);
      if (changed) commit();
      closeSheet(); toast(changed ? 'Entry updated' : 'No changes');
    } else {
      M.addLateEntry(S, c.id, { ...v, now: Date.now() }); commit();
      closeSheet(); toast(`Added ${hhmm(v.t, c.tz)} ${abbr(v.t, c.tz)}`);
    }
  },
  'del-entry'() {
    const { caseId, entryId } = U.sheet;
    confirmSheet('Delete this entry?', 'It will be removed from the case log. This cannot be undone.', 'Delete entry',
      () => { M.deleteEntry(S, caseId, entryId); commit(); render(); toast('Entry deleted'); });
  },
  'del-case'() {
    const c = reviewCase();
    confirmSheet(`Delete ${M.caseName(c)}?`, `All ${c.entries.length} ${c.entries.length === 1 ? 'entry' : 'entries'} will be removed from this phone. This cannot be undone. Copy the log first if you still need it.`, 'Delete case',
      () => { M.deleteCase(S, c.id); commit(); U.reviewId = S.activeId; render(); toast('Case deleted'); });
  },
  'tz-save'() {
    const c = M.caseById(S, U.sheet.caseId);
    M.setCaseZone(S, c.id, document.getElementById('ov-tz').value); commit();
    closeSheet(); toast(`Showing times in ${abbr(M.startOf(c), c.tz)}`);
  },
  'rename-save'() { M.renameCase(S, U.sheet.caseId, document.getElementById('ov-name').value); commit(); closeSheet(); },
  copy() { copyLog(reviewCase()); },
  palette(v) { S.palette = v; commit(); applyPalette(); render(); },
  'op-up'(v) { M.moveOp(S, +v, -1); commit(); render(); },
  'op-down'(v) { M.moveOp(S, +v, 1); commit(); render(); },
  'op-del'(v) {
    confirmSheet(`Remove “${S.ops[+v]}”?`, 'Entries already saved keep this operation. It only leaves the dropdown.', 'Remove',
      () => { M.removeOp(S, +v); commit(); render(); });
  },
  'op-reset'() {
    confirmSheet('Restore default operations?', 'The list goes back to the original operations. Operations you added or renamed leave the dropdown; entries already saved keep them.', 'Restore',
      () => { M.resetOps(S); commit(); render(); toast('Default operations restored'); });
  },
  'op-add'() {
    const input = document.getElementById('new-op');
    if (M.addOp(S, input.value)) { commit(); render(); document.getElementById('new-op')?.focus(); }
    else if (input.value.trim()) toast('That operation is already in the list');
  },
};

app.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]'); if (!el || el.disabled) return;
  if (el.dataset.act === 'scrim' && ev.target !== el) return;
  actions[el.dataset.act]?.(el.dataset.v);
});
app.addEventListener('input', ev => {
  const b = ev.target.dataset.bind; if (!b) return;
  U[b] = ev.target.value;
  if (U.error) { U.error = ''; const er = app.querySelector('.log .err'); if (er) er.textContent = ''; }
});
app.addEventListener('change', ev => {
  const i = ev.target.dataset.rename; if (i === undefined) return;
  if (M.renameOp(S, +i, ev.target.value)) commit(); else toast('Name must be filled in and not already used');
  render();
});
app.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && U.sheet) closeSheet();
  if (ev.key === 'Enter' && ev.target.id === 'new-op') actions['op-add']();
  if (ev.key === 'Enter' && ev.target.id === 'ov-name') actions['rename-save']();
});

// Another tab or window changed the data.
addEventListener('storage', ev => { if (ev.key && ev.key.startsWith('timestamper.')) { Object.assign(S, load()); applyPalette(); if (!U.sheet) render(); } });
// Coming back to the app: redraw so day headings, staleness and the clock are current.
document.addEventListener('visibilitychange', () => { if (!document.hidden && !U.sheet) { render(); tick(); } });

addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); installEvent = ev; if (!U.sheet) render(); });
addEventListener('appinstalled', () => { installEvent = null; render(); });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline support unavailable */ });
  navigator.serviceWorker.addEventListener('controllerchange', readVersion);
}

// The installed version is the suffix of the offline cache name (VERSION in sw.js).
function readVersion() {
  if (!self.caches) return;
  caches.keys().then(keys => {
    const k = keys.find(x => x.startsWith('timestamper-'));
    U.version = k ? k.slice('timestamper-'.length) : '';
    if (U.screen === 'settings' && !U.sheet) render();
  }).catch(() => {});
}
readVersion();

applyPalette();
render();
if (navigator.storage?.persisted) navigator.storage.persisted().then(p => { U.storage = p ? 'granted' : 'denied'; if (U.screen === 'settings' && !U.sheet) render(); }).catch(() => { U.storage = 'unsupported'; });
else U.storage = 'unsupported';
if (S.cases.length) requestPersistence().then(v => { U.storage = v; });
