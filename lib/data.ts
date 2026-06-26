// lib/data.ts
//
// Everything related to journal data lives here:
//   - shape of a journal entry (with full creation/edit timestamps)
//   - the option lists used by the check-in flow
//   - a small local database (IndexedDB) that persists entries on-device,
//     with a localStorage fallback/mirror for environments where
//     IndexedDB isn't available (e.g. some private-browsing modes).
//   - an optional Google Sheets sync (set NEXT_PUBLIC_SHEETS_WEBHOOK in .env.local)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Mood = {
  key: string;
  label: string;
  emoji: string;
};

export interface JournalEntry {
  id: string;
  /** Epoch ms when the entry was first created. Kept for fast sorting/streaks. */
  timestamp: number;
  /** ISO-8601 timestamp of creation, e.g. "2026-06-27T14:32:08.123Z" */
  createdAt: string;
  /** ISO-8601 timestamp of the most recent edit, if any. */
  updatedAt?: string;
  moods: string[];
  intensity: number;
  journal: string;
  thoughts: string;
  origin: string;
  originOther?: string;
  body: string[];
  helped: string[];
}

/** The shape of the in-progress check-in, before it becomes a saved entry. */
export type Draft = Omit<JournalEntry, "id" | "timestamp" | "createdAt" | "updatedAt">;

export const EMPTY_DRAFT: Draft = {
  moods: [],
  intensity: 5,
  journal: "",
  thoughts: "",
  origin: "",
  originOther: "",
  body: [],
  helped: [],
};

// ---------------------------------------------------------------------------
// Option lists used throughout the check-in flow
// ---------------------------------------------------------------------------

export const MOODS: Mood[] = [
  { key: "joyful", label: "Joyful", emoji: "😊" },
  { key: "calm", label: "Calm", emoji: "😌" },
  { key: "anxious", label: "Anxious", emoji: "😰" },
  { key: "sad", label: "Sad", emoji: "😢" },
  { key: "angry", label: "Angry", emoji: "😠" },
  { key: "overwhelmed", label: "Overwhelmed", emoji: "🥴" },
  { key: "grateful", label: "Grateful", emoji: "🙏" },
  { key: "lonely", label: "Lonely", emoji: "🥺" },
  { key: "hopeful", label: "Hopeful", emoji: "🌱" },
];

export const ORIGIN_OPTIONS = [
  "A specific event today",
  "A memory from the past",
  "Worry about the future",
  "Something someone said",
  "Not sure — it just appeared",
];

export const BODY_OPTIONS = [
  "Tight chest",
  "Racing heart",
  "Stomach knots",
  "Heavy limbs",
  "Headache",
  "Shallow breathing",
  "Shoulder tension",
  "Restlessness",
  "Nothing noticeable",
];

export const HELPED_OPTIONS = [
  { key: "Talking to someone", emoji: "💬" },
  { key: "Deep breathing", emoji: "🌬️" },
  { key: "Going for a walk", emoji: "🚶" },
  { key: "Writing it out", emoji: "✍️" },
  { key: "Music", emoji: "🎵" },
  { key: "Resting", emoji: "🛌" },
  { key: "Nothing yet", emoji: "🤍" },
];

export const THOUGHT_SUGGESTIONS = [
  "I'm not good enough",
  "This will never get better",
  "Everyone is judging me",
  "I should be handling this better",
  "It's all my fault",
  "Nothing I do matters",
];

/** localStorage key for the in-progress (unsaved) check-in draft. */
export const DRAFT_KEY = "stillwater:checkin-draft";

// ---------------------------------------------------------------------------
// Local database (IndexedDB, with a localStorage fallback/mirror)
// ---------------------------------------------------------------------------

const DB_NAME = "stillwater-db";
const DB_VERSION = 1;
const STORE_NAME = "entries";
/** Fallback/mirror key used only if IndexedDB is unavailable. */
const LOCAL_STORAGE_FALLBACK_KEY = "stillwater:entries";

function hasIndexedDB(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDB()) {
      reject(new Error("IndexedDB is not available in this environment"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// --- localStorage fallback helpers (also used as a quick-read mirror) ----

function readFallback(): JournalEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY);
    return raw ? (JSON.parse(raw) as JournalEntry[]) : [];
  } catch {
    return [];
  }
}

function writeFallback(entries: JournalEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, JSON.stringify(entries));
  } catch {
    // localStorage can fail (quota, privacy mode) — safe to ignore, IndexedDB
    // remains the source of truth when available.
  }
}

// --- public API -------------------------------------------------------

/**
 * Persist a brand-new journal entry. Stamps `timestamp`/`createdAt`
 * with the exact moment the entry was saved.
 */
export async function saveEntry(
  draft: Draft,
): Promise<JournalEntry> {
  const now = new Date();
  const entry: JournalEntry = {
    ...draft,
    id: crypto.randomUUID(),
    timestamp: now.getTime(),
    createdAt: now.toISOString(),
  };

  if (hasIndexedDB()) {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // fall through to localStorage-only persistence below
    }
  }

  // Always keep the localStorage mirror in sync so reads are instant
  // even before IndexedDB resolves, and so data survives if IndexedDB
  // is unavailable.
  const mirror = readFallback();
  writeFallback([entry, ...mirror]);

  // Fire-and-forget sync to Google Sheets (no-op if webhook not configured)
  syncEntryToSheets(entry);

  return entry;
}

/** Update an existing entry (stamps `updatedAt` with the edit time). */
export async function updateEntry(
  id: string,
  patch: Partial<Draft>,
): Promise<void> {
  const updatedAt = new Date().toISOString();

  if (hasIndexedDB()) {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const existing = getReq.result as JournalEntry | undefined;
          if (existing) {
            store.put({ ...existing, ...patch, updatedAt });
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // ignore — fallback below still applies
    }
  }

  const mirror = readFallback();
  writeFallback(
    mirror.map((e) => (e.id === id ? { ...e, ...patch, updatedAt } : e)),
  );
}

/** Permanently delete a single entry. */
export async function deleteEntry(id: string): Promise<void> {
  if (hasIndexedDB()) {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // ignore — fallback below still applies
    }
  }

  writeFallback(readFallback().filter((e) => e.id !== id));
}

/**
 * Load every entry, newest first.
 * Strategy:
 *   1. Return local entries immediately (IndexedDB → localStorage fallback)
 *      so the UI is never blank while the network request is in flight.
 *   2. Fire a background fetch from Google Sheets (if the webhook is set).
 *      When that resolves, merge the remote entries into local storage so
 *      future loads start from the combined, up-to-date set.
 *
 * Callers that want the live-updated list should listen to the promise;
 * the dashboard re-fetches after save so one load cycle is enough.
 */
export async function loadEntries(): Promise<JournalEntry[]> {
  // --- 1. Read local entries first ---
  let local: JournalEntry[] = [];

  if (hasIndexedDB()) {
    try {
      const db = await openDB();
      local = await new Promise<JournalEntry[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result as JournalEntry[]);
        request.onerror = () => reject(request.error);
      });
    } catch {
      local = readFallback();
    }
  } else {
    local = readFallback();
  }

  // --- 2. Fetch from Sheets and merge ---
  if (SHEETS_WEBHOOK) {
    try {
      const remote = await fetchEntriesFromSheets();
      if (remote.length > 0) {
        // Merge: remote wins on conflict (same id), local-only entries kept
        const byId = new Map<string, JournalEntry>();
        for (const e of local)  byId.set(e.id, e);
        for (const e of remote) byId.set(e.id, e); // remote overwrites
        const merged = [...byId.values()].sort((a, b) => b.timestamp - a.timestamp);

        // Persist the merged set locally so next load is instant
        if (hasIndexedDB()) {
          try {
            const db = await openDB();
            await new Promise<void>((resolve, reject) => {
              const tx = db.transaction(STORE_NAME, "readwrite");
              const store = tx.objectStore(STORE_NAME);
              store.clear();
              for (const e of merged) store.put(e);
              tx.oncomplete = () => resolve();
              tx.onerror = () => reject(tx.error);
            });
          } catch { /* ignore */ }
        }
        writeFallback(merged);
        return merged;
      }
    } catch { /* network unavailable — fall through to local */ }
  }

  const sorted = local.sort((a, b) => b.timestamp - a.timestamp);
  writeFallback(sorted);
  return sorted;
}

/** Fetch all entries from Google Sheets via the Apps Script GET endpoint. */
async function fetchEntriesFromSheets(): Promise<JournalEntry[]> {
  if (!SHEETS_WEBHOOK) return [];
  const res = await fetch(SHEETS_WEBHOOK, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  // Basic validation: must have an id and timestamp
  return (data as JournalEntry[]).filter(
    (e) => e && typeof e.id === "string" && typeof e.timestamp === "number",
  );
}

// ---------------------------------------------------------------------------
// Derived stats
// ---------------------------------------------------------------------------

/**
 * Counts the current consecutive-day check-in streak, looking backward
 * from today. A day with zero entries breaks the streak, unless it's
 * today (so the streak doesn't reset to 0 before you've checked in yet).
 */
export function computeStreak(entries: JournalEntry[]): number {
  if (entries.length === 0) return 0;

  const days = new Set(
    entries.map((e) => new Date(e.timestamp).toDateString()),
  );

  let streak = 0;
  const cursor = new Date();

  // If there's no entry today, that's fine — start checking from
  // yesterday so an empty "today" doesn't zero out an active streak.
  if (!days.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

/** Friendly "Jun 27, 2026 · 2:32 PM" formatting for the exact entry time. */
export function formatEntryTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Google Sheets sync (optional — set NEXT_PUBLIC_SHEETS_WEBHOOK in .env.local)
// ---------------------------------------------------------------------------

const SHEETS_WEBHOOK =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_SHEETS_WEBHOOK ?? "")
    : "";

/**
 * Fire-and-forget POST of a single entry to your Google Apps Script Web App.
 * Silently no-ops if the webhook URL isn't configured.
 */
function syncEntryToSheets(entry: JournalEntry): void {
  if (!SHEETS_WEBHOOK) return;
  try {
    fetch(SHEETS_WEBHOOK, {
      method: "POST",
      mode: "no-cors", // Apps Script doesn't return CORS headers on no-cors requests
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(entry),
    }).catch(() => {}); // swallow any network error silently
  } catch {}
}

/**
 * Sync every entry in bulk to Sheets — useful for exporting existing local data.
 * Call `onProgress(done, total)` after each entry so you can show a progress bar.
 */
export async function syncAllEntriesToSheets(
  entries: JournalEntry[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ synced: number; failed: number }> {
  if (!SHEETS_WEBHOOK) return { synced: 0, failed: 0 };
  let synced = 0;
  let failed = 0;
  // Send oldest → newest so the sheet stays in chronological order
  const ordered = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  for (let i = 0; i < ordered.length; i++) {
    try {
      await fetch(SHEETS_WEBHOOK, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(ordered[i]),
      });
      synced++;
    } catch {
      failed++;
    }
    onProgress?.(i + 1, ordered.length);
  }
  return { synced, failed };
}
