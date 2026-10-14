import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hhmm, dateStr, abbr, offset, zonedToUtc, HOUR, MIN } from '../js/time.js';
import * as M from '../js/model.js';

const DEN = 'America/Denver', NY = 'America/New_York';
const T0 = Date.UTC(2026, 9, 14, 20, 7); // 14 Oct 2026 14:07 MDT

test('times display in 24-hour form with the zone abbreviation', () => {
  assert.equal(hhmm(T0, DEN), '14:07');
  assert.equal(abbr(T0, DEN), 'MDT');
  assert.equal(dateStr(T0, DEN), '14 Oct 2026');
  assert.equal(offset(T0, DEN), 'UTC−06:00');
  assert.equal(hhmm(T0, NY), '16:07');
});

test('zonedToUtc round-trips, including across a DST change', () => {
  assert.equal(zonedToUtc(2026, 10, 14, 14, 7, DEN), T0);
  const winter = zonedToUtc(2026, 11, 2, 9, 0, DEN); // after DST ends (1 Nov)
  assert.equal(hhmm(winter, DEN), '09:00');
  assert.equal(abbr(winter, DEN), 'MST');
});

test('first save starts a case in the phone zone; later saves keep that zone', () => {
  const s = M.newState();
  const { c } = M.saveEntry(s, { op: 'Depart Sending', note: '', now: T0, phoneTz: DEN });
  assert.equal(s.activeId, c.id);
  M.saveEntry(s, { op: 'Arrive Airport 1', note: '', now: T0 + HOUR, phoneTz: NY });
  assert.equal(s.cases.length, 1);
  assert.equal(c.tz, DEN);
  assert.equal(c.entries.length, 2);
});

test('an entry needs an operation or a note', () => {
  const s = M.newState();
  assert.throws(() => M.saveEntry(s, { op: '', note: '   ', now: T0, phoneTz: DEN }));
  assert.equal(s.cases.length, 0);
  M.saveEntry(s, { op: '', note: 'Wheels up', now: T0, phoneTz: DEN });
  assert.equal(s.cases[0].entries[0].note, 'Wheels up');
});

test('a case goes stale 4 hours after the last save', () => {
  const s = M.newState();
  M.saveEntry(s, { op: 'Handoff', now: T0, phoneTz: DEN });
  assert.equal(M.isStale(s, T0 + 4 * HOUR - MIN), false);
  assert.equal(M.isStale(s, T0 + 4 * HOUR), true);
  const { c } = M.saveEntry(s, { op: 'Arrive Sending', now: T0 + 5 * HOUR, phoneTz: NY, newCase: true });
  assert.equal(s.cases.length, 2);
  assert.equal(c.tz, NY);
  assert.equal(M.isStale(s, T0 + 5 * HOUR + MIN), false);
});

test('new case closes the active case; an empty one is not kept', () => {
  const s = M.newState();
  M.saveEntry(s, { op: 'Handoff', now: T0, phoneTz: DEN });
  M.closeActive(s);
  assert.equal(s.activeId, null);
  assert.equal(s.cases.length, 1);
  M.saveEntry(s, { op: 'Handoff', now: T0 + MIN, phoneTz: DEN });
  assert.equal(s.cases.length, 2);
});

test('editing keeps the original timestamp and marks the entry', () => {
  const s = M.newState();
  const { c, e } = M.saveEntry(s, { op: 'Depart Airport 1', now: T0, phoneTz: DEN });
  assert.equal(M.editEntry(s, c.id, e.id, { t: e.t, op: e.op, note: '' }), false);
  assert.equal(e.edited, false);
  assert.equal(M.editEntry(s, c.id, e.id, { t: T0 - 3 * MIN, op: e.op, note: '' }), true);
  assert.equal(e.edited, true);
  assert.equal(e.orig, T0);
  assert.equal(e.t, T0 - 3 * MIN);
});

test('late entries are marked and sorted into place', () => {
  const s = M.newState();
  const { c } = M.saveEntry(s, { op: 'Arrive Airport 1', now: T0, phoneTz: DEN });
  const late = M.addLateEntry(s, c.id, { t: T0 - 30 * MIN, op: 'Depart Sending', note: '', now: T0 + HOUR });
  assert.equal(late.late, true);
  assert.deepEqual(M.sortedEntries(c).map(e => e.op), ['Depart Sending', 'Arrive Airport 1']);
  assert.equal(M.startOf(c), T0 - 30 * MIN);
});

test('changing the case zone changes display only', () => {
  const s = M.newState();
  const { c, e } = M.saveEntry(s, { op: 'Handoff', now: T0, phoneTz: DEN });
  M.setCaseZone(s, c.id, NY);
  assert.equal(e.t, T0);
  assert.match(M.logText(c), /16:07 EDT {2}Handoff/);
});

test('copied log has the zone, UTC offset, day headings and marks', () => {
  const s = M.newState();
  const { c, e } = M.saveEntry(s, { op: 'Depart Sending', note: 'Unit 4', now: T0, phoneTz: DEN });
  M.saveEntry(s, { op: 'Arrive Receiving', now: T0 + 10 * HOUR, phoneTz: DEN });
  M.editEntry(s, c.id, e.id, { t: T0 - 2 * MIN, op: 'Depart Sending', note: 'Unit 4' });
  M.addLateEntry(s, c.id, { t: T0 + HOUR, op: '', note: 'Fuel stop', now: T0 + 11 * HOUR });
  M.renameCase(s, c.id, '  Case 2291 ');
  assert.equal(M.logText(c), [
    'Case 2291',
    'Times in Denver (MDT, UTC−06:00)',
    '',
    '14 Oct 2026',
    '14:05 MDT  Depart Sending · Unit 4  (edited; saved 14:07)',
    '15:07 MDT  Fuel stop  (late entry)',
    '',
    '15 Oct 2026',
    '00:07 MDT  Arrive Receiving',
  ].join('\n'));
});

test('deleting the active case leaves no active case', () => {
  const s = M.newState();
  const { c, e } = M.saveEntry(s, { op: 'Handoff', now: T0, phoneTz: DEN });
  M.deleteEntry(s, c.id, e.id);
  assert.equal(c.entries.length, 0);
  M.deleteCase(s, c.id);
  assert.equal(s.cases.length, 0);
  assert.equal(s.activeId, null);
});

test('operation list edits', () => {
  const s = M.newState();
  assert.equal(M.addOp(s, 'Handoff'), false);
  assert.equal(M.addOp(s, ' Fuel '), true);
  assert.equal(s.ops.at(-1), 'Fuel');
  assert.equal(M.renameOp(s, 0, 'Depart Airport 1'), false);
  M.moveOp(s, 0, -1);
  M.moveOp(s, 0, 1);
  assert.deepEqual(s.ops.slice(0, 2), ['Depart Airport 1', 'Arrive Airport 1']);
  M.removeOp(s, 0);
  assert.equal(s.ops[0], 'Arrive Airport 1');
});
