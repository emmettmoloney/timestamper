// Domain rules for Cases and Entries (terms in CONTEXT.md). Pure functions over a
// plain state object, so they run the same in the browser and in node tests.

import { HOUR, hhmm, dateStr, abbr, offset, zoneName } from './time.js';

export const STALE_AFTER = 4 * HOUR;

export const DEFAULT_OPS = [
  'Arrive Airport 1', 'Depart Airport 1', 'Arrive Airport 2', 'Depart Airport 2',
  'Arrive Sending', 'Depart Sending', 'Arrive Receiving', 'Handoff',
];

export const newState = () => ({
  version: 1, cases: [], activeId: null, ops: [...DEFAULT_OPS], palette: 'auto', installDismissed: false,
});

export const newId = () => (globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2));

export const isEntryValid = (op, note) => Boolean(op || (note && note.trim()));

export const caseById = (s, id) => s.cases.find(c => c.id === id) || null;
export const activeCase = s => caseById(s, s.activeId);

export const sortedEntries = c => [...c.entries].sort((a, b) => a.t - b.t || a.orig - b.orig);
export const startOf = c => (c.entries.length ? Math.min(...c.entries.map(e => e.t)) : c.createdAt);
export const caseName = c => c.name || `Case of ${dateStr(startOf(c), c.tz)}`;

/** Last time anything was saved into the case (Original Timestamps, not corrected ones). */
export const lastActivity = c => Math.max(c.createdAt, ...c.entries.map(e => e.orig));

/** Saving now would go into a case nobody has touched for STALE_AFTER. */
export function isStale(s, now) {
  const c = activeCase(s);
  return Boolean(c) && now - lastActivity(c) >= STALE_AFTER;
}

function openCase(s, tz, now) {
  const c = { id: newId(), name: '', tz, createdAt: now, entries: [] };
  s.cases.unshift(c);
  s.activeId = c.id;
  return c;
}

const makeEntry = (t, orig, op, note, late) =>
  ({ id: newId(), t, orig, op: op || '', note: (note || '').trim(), edited: false, late });

/**
 * Save a live Entry at `now`. Starts a Case in `phoneTz` when none is open, or
 * when `newCase` is set (the user answered "Start a new case?" with yes).
 */
export function saveEntry(s, { op, note, now, phoneTz, newCase = false }) {
  if (!isEntryValid(op, note)) throw new Error('Pick an operation or type a note.');
  let c = activeCase(s);
  if (!c || newCase) c = openCase(s, phoneTz, now);
  const e = makeEntry(now, now, op, note, false);
  c.entries.push(e);
  return { c, e };
}

/** New case: close the Active Case. The next Save starts another one. */
export function closeActive(s) {
  const c = activeCase(s);
  if (c && !c.entries.length) s.cases = s.cases.filter(x => x !== c);
  s.activeId = null;
}

export function addLateEntry(s, caseId, { t, op, note, now }) {
  if (!isEntryValid(op, note)) throw new Error('Pick an operation or type a note.');
  const c = caseById(s, caseId);
  const e = makeEntry(t, now, op, note, true);
  c.entries.push(e);
  return e;
}

/** Returns true when something changed; the Original Timestamp is never touched. */
export function editEntry(s, caseId, entryId, { t, op, note }) {
  if (!isEntryValid(op, note)) throw new Error('Pick an operation or type a note.');
  const e = caseById(s, caseId).entries.find(x => x.id === entryId);
  const next = { t, op: op || '', note: (note || '').trim() };
  const changed = e.t !== next.t || e.op !== next.op || e.note !== next.note;
  if (changed) Object.assign(e, next, { edited: true });
  return changed;
}

export function deleteEntry(s, caseId, entryId) {
  const c = caseById(s, caseId);
  c.entries = c.entries.filter(x => x.id !== entryId);
}

export function deleteCase(s, caseId) {
  s.cases = s.cases.filter(c => c.id !== caseId);
  if (s.activeId === caseId) s.activeId = null;
}

export const setCaseZone = (s, caseId, tz) => { caseById(s, caseId).tz = tz; };
export const renameCase = (s, caseId, name) => { caseById(s, caseId).name = name.trim(); };

/** Entries grouped under one heading per day, in the Case Time Zone. */
export function groupByDay(c) {
  const out = [];
  for (const e of sortedEntries(c)) {
    const day = dateStr(e.t, c.tz);
    if (out.at(-1)?.day !== day) out.push({ day, items: [] });
    out.at(-1).items.push(e);
  }
  return out;
}

/** Plain-text Case Log for copying into documentation by hand. */
export function logText(c) {
  const st = startOf(c);
  const lines = [caseName(c), `Times in ${zoneName(c.tz)} (${abbr(st, c.tz)}, ${offset(st, c.tz)})`];
  for (const g of groupByDay(c)) {
    lines.push('', g.day);
    for (const e of g.items) {
      const what = [e.op, e.note].filter(Boolean).join(' · ');
      const flags = [
        e.edited ? `edited; saved ${dateStr(e.orig, c.tz) === g.day ? '' : dateStr(e.orig, c.tz) + ' '}${hhmm(e.orig, c.tz)}` : '',
        e.late ? 'late entry' : '',
      ].filter(Boolean);
      lines.push(`${hhmm(e.t, c.tz)} ${abbr(e.t, c.tz)}  ${what}${flags.length ? `  (${flags.join('; ')})` : ''}`);
    }
  }
  return lines.join('\n');
}

// Operation list (Settings)
export function addOp(s, name) {
  const v = name.trim();
  if (!v || s.ops.includes(v)) return false;
  s.ops.push(v);
  return true;
}
export function renameOp(s, i, name) {
  const v = name.trim();
  if (!v || s.ops.some((o, j) => o === v && j !== i)) return false;
  s.ops[i] = v;
  return true;
}
export function moveOp(s, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= s.ops.length) return;
  [s.ops[i], s.ops[j]] = [s.ops[j], s.ops[i]];
}
export const removeOp = (s, i) => { s.ops.splice(i, 1); };
