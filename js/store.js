// On-device storage. Everything lives in this browser's localStorage; nothing
// leaves the phone. Nothing here ever deletes data on its own.

import { newState, DEFAULT_OPS } from './model.js';

const KEY = 'timestamper.v1';

export function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { /* storage blocked */ }
  if (!raw) return newState();
  try {
    const s = JSON.parse(raw);
    return { ...newState(), ...s, ops: Array.isArray(s.ops) ? s.ops : [...DEFAULT_OPS] };
  } catch {
    // Keep the unreadable copy rather than overwrite it.
    try { localStorage.setItem(`${KEY}.unreadable.${Date.now()}`, raw); } catch { /* ignore */ }
    return newState();
  }
}

/** Returns false if the write failed (storage full or blocked). */
export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; }
}

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistence() {
  try {
    if (!navigator.storage?.persist) return 'unsupported';
    if (await navigator.storage.persisted()) return 'granted';
    return (await navigator.storage.persist()) ? 'granted' : 'denied';
  } catch { return 'unsupported'; }
}
