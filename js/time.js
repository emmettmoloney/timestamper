// Time display helpers. Every instant is a UTC millisecond count; a time zone
// only decides how it is shown (docs/adr/0001-entries-display-in-case-time-zone.md).

export const MIN = 60_000;
export const HOUR = 60 * MIN;

export const phoneZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const fmt = (ms, tz, opts) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, ...opts }).format(ms);

/** "14:07" — 24-hour, no seconds. */
export const hhmm = (ms, tz) => fmt(ms, tz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** "14 Oct 2026" — used once per day as a heading. */
export const dateStr = (ms, tz) => fmt(ms, tz, { day: 'numeric', month: 'short', year: 'numeric' });

function zonePart(ms, tz, style) {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: style })
    .formatToParts(ms).find(p => p.type === 'timeZoneName').value;
}

/** "MDT" where the platform knows one, otherwise "GMT+1". */
export const abbr = (ms, tz) => zonePart(ms, tz, 'short');

/** "UTC−06:00" (or "UTC" at zero). Used in copied text, which must be unambiguous. */
export const offset = (ms, tz) => zonePart(ms, tz, 'longOffset').replace('GMT', 'UTC').replace('-', '−');

/** Offset of `tz` from UTC at instant `ms`, in milliseconds. */
export function offsetMs(ms, tz) {
  const p = parts(ms, tz);
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000;
}

/** Wall-clock fields of `ms` as seen in `tz`. */
export function parts(ms, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(ms).map(x => [x.type, x.value]));
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second };
}

/** The instant at which the wall clock in `tz` reads the given date and time. */
export function zonedToUtc(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  return guess - offsetMs(guess - offsetMs(guess, tz), tz);
}

/** "Denver" from "America/Denver". */
export const zoneName = tz => tz.split('/').pop().replace(/_/g, ' ');

export const pad = n => String(n).padStart(2, '0');

/** Every zone the platform supports, with common North American zones first. */
export function zoneList(current) {
  const common = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix',
    'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu', 'UTC'];
  let all = [];
  try { all = Intl.supportedValuesOf('timeZone'); } catch { /* older browsers: common list only */ }
  const rest = all.filter(z => !common.includes(z));
  const list = [...common, ...rest];
  if (current && !list.includes(current)) list.unshift(current);
  return { common, rest, list };
}
