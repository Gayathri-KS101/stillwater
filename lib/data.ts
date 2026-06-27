// lib/data.ts
//
// Data layer for Fragilewhispers.
//
// Architecture: React Components → data.ts (this file) → Google Apps Script → Google Sheets
//
// Google Sheets is the single source of truth. There is no local persistence
// for entries (no IndexedDB, no localStorage mirror). Every create / update /
// delete goes straight to the deployed Apps Script Web App, and every load
// re-fetches from it.
//
// NOTE on HTTP verbs: Apps Script Web Apps only ever dispatch doGet() and
// doPost() — there is no real PUT/DELETE trigger. So all mutations
// (create / update / delete) are sent as POST requests with an `action`
// field, and the Apps Script (code.gs) branches on that field.

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
  /** Derived from createdAt on read — not stored separately in the sheet. */
  timestamp: number;
  createdAt: string;
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
// Option lists (unchanged — UI depends on these)
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

/** Local key for the in-progress check-in draft only (not the entries DB). */
export const DRAFT_KEY = "stillwater:checkin-draft";

// ---------------------------------------------------------------------------
// Apps Script transport
// ---------------------------------------------------------------------------

const SHEETS_WEBHOOK = process.env.NEXT_PUBLIC_SHEETS_WEBHOOK ?? "";

export class SheetsError extends Error {}

function getWebhookUrl(): string {
  if (!SHEETS_WEBHOOK) {
    throw new SheetsError(
      "NEXT_PUBLIC_SHEETS_WEBHOOK is not set. Point it at your deployed Google Apps Script Web App URL.",
    );
  }
  return SHEETS_WEBHOOK;
}

type SheetsAction =
  | { action: "create"; entry: JournalEntry }
  | { action: "update"; id: string; patch: Partial<Draft> & { updatedAt: string } }
  | { action: "delete"; id: string };

/**
 * POST to Apps Script. Uses `text/plain` (rather than `application/json`)
 * deliberately — this keeps the request a CORS "simple request" so the
 * browser skips the preflight OPTIONS call, which Apps Script Web Apps
 * don't handle.
 */
async function postToSheets<T>(payload: SheetsAction): Promise<T> {
  const res = await fetch(getWebhookUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new SheetsError(`Sheets request failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { error?: string } & T;
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new SheetsError(data.error);
  }
  return data;
}

async function getAllFromSheets(): Promise<JournalEntry[]> {
  const res = await fetch(getWebhookUrl(), { method: "GET", cache: "no-store" });
  if (!res.ok) {
    throw new SheetsError(`Sheets request failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (Array.isArray(data)) return data as JournalEntry[];
  if (data && typeof data === "object" && "error" in data) {
    throw new SheetsError(String((data as { error: unknown }).error));
  }
  return [];
}

// ---------------------------------------------------------------------------
// Public CRUD API (same signatures the UI already calls)
// ---------------------------------------------------------------------------

/** Fetch every entry from Google Sheets — the single source of truth. */
export async function loadEntries(): Promise<JournalEntry[]> {
  const entries = await getAllFromSheets();
  return entries.sort((a, b) => b.timestamp - a.timestamp);
}

/** Create a new entry: assigns a UUID, appends a row in Sheets. */
export async function saveEntry(draft: Draft): Promise<JournalEntry> {
  const now = new Date();
  const entry: JournalEntry = {
    ...draft,
    id: crypto.randomUUID(),
    timestamp: now.getTime(),
    createdAt: now.toISOString(),
  };

  await postToSheets<{ status: string; entry: JournalEntry }>({ action: "create", entry });
  return entry;
}

/** Update an existing entry by its stable UUID (never by row number). */
export async function updateEntry(id: string, patch: Partial<Draft>): Promise<JournalEntry> {
  const updatedAt = new Date().toISOString();
  const result = await postToSheets<{ status: string; entry: JournalEntry }>({
    action: "update",
    id,
    patch: { ...patch, updatedAt },
  });
  return result.entry;
}

/** Delete an entry by its stable UUID (never by row number). */
export async function deleteEntry(id: string): Promise<void> {
  await postToSheets<{ status: string; id: string }>({ action: "delete", id });
}

// ---------------------------------------------------------------------------
// Derived stats (unchanged — pure functions over already-loaded entries)
// ---------------------------------------------------------------------------

export function computeStreak(entries: JournalEntry[]): number {
  if (entries.length === 0) return 0;

  const days = new Set(entries.map((e) => new Date(e.timestamp).toDateString()));

  let streak = 0;
  const cursor = new Date();

  if (!days.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

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