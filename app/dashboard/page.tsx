"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookHeart, Flame, NotebookPen, Plus, ArrowRight, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  computeStreak,
  deleteEntry,
  formatEntryTimestamp,
  loadEntries,
  MOODS,
  HELPED_OPTIONS,
  type JournalEntry,
} from "@/lib/data";

export default function Dashboard() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  useEffect(() => {
    document.title = "Your journal — Fragilewhispers";
    loadEntries()
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  const streak = useMemo(() => computeStreak(entries), [entries]);

  const onDelete = async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (selectedEntry?.id === id) setSelectedEntry(null);
    await deleteEntry(id);
    toast("Entry removed");
  };

  return (
    <main className="relative min-h-screen pb-24">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-0 h-96 w-96 rounded-full bg-lavender/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-sky/30 blur-3xl" />
      </div>

      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6 sm:py-6">
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-lavender-deep to-sky-deep text-white">
            <BookHeart className="h-4 w-4" />
          </div>
          <span className="font-display text-base font-medium truncate">Fragilewhispers</span>
        </Link>
        <Link href="/checkin" className="shrink-0 ml-3">
          <motion.span
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-lavender-deep to-sky-deep px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-soft)] whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span>New check-in</span>
          </motion.span>
        </Link>
      </header>

      <section className="relative mx-auto max-w-5xl px-4 pt-4 sm:px-6 sm:pt-6">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-medium tracking-tight md:text-5xl"
        >
          Welcome back.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-2 text-muted-foreground"
        >
          {loading
            ? "Loading your entries…"
            : entries.length === 0
              ? "Your story starts with a single check-in."
              : "Here's how you've been showing up for yourself."}
        </motion.p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat icon={<Flame className="h-4 w-4" />} label="Current streak" value={`${streak} ${streak === 1 ? "day" : "days"}`} />
          <Stat icon={<NotebookPen className="h-4 w-4" />} label="Total entries" value={String(entries.length)} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
          

          
        </div>

        <div className="mt-6 glass rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-medium">Recent entries</h2>
            <Link href="/checkin" className="inline-flex items-center gap-1 text-xs text-lavender-deep hover:underline">
              Add another <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {entries.length === 0 ? (
            <EmptyMini cta />
          ) : (
            <ul className="divide-y divide-border/60">
              {entries.slice(0, 8).map((e) => (
                <li
                  key={e.id}
                  className="flex items-start justify-between gap-4 py-4 cursor-pointer group rounded-2xl px-2 -mx-2 transition-colors hover:bg-lavender/10"
                  onClick={() => setSelectedEntry(e)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(ev) => ev.key === "Enter" && setSelectedEntry(e)}
                  aria-label={`View entry from ${formatEntryTimestamp(e.createdAt)}`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {e.moods.slice(0, 3).map((k) => {
                        const m = MOODS.find((x) => x.key === k);
                        return m ? (
                          <span key={k} className="rounded-full bg-secondary/60 px-2.5 py-0.5 text-xs">
                            {m.emoji} {m.label}
                          </span>
                        ) : null;
                      })}
                      {e.moods.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{e.moods.length - 3}</span>
                      )}
                    </div>
                    {e.journal && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{e.journal}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {formatEntryTimestamp(e.createdAt)}
                      {e.updatedAt ? " · edited" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-start gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium">{e.intensity}/10</div>
                    </div>
                    <button
                      onClick={(ev) => { ev.stopPropagation(); onDelete(e.id); }}
                      aria-label="Delete entry"
                      className="text-muted-foreground/60 transition-colors hover:text-destructive hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Entry detail modal */}
      <AnimatePresence>
        {selectedEntry && (
          <EntryModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} onDelete={onDelete} />
        )}
      </AnimatePresence>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Entry detail modal
// ---------------------------------------------------------------------------

function EntryModal({ entry, onClose, onDelete }: { entry: JournalEntry; onClose: () => void; onDelete: (id: string) => void }) {
  const moodLabels = entry.moods
    .map((k) => MOODS.find((m) => m.key === k))
    .filter(Boolean) as { label: string; emoji: string; key: string }[];

  const helpedLabels = entry.helped
    .map((k) => HELPED_OPTIONS.find((h) => h.key === k))
    .filter(Boolean) as { key: string; emoji: string }[];

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
      onClick={handleBackdrop}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl bg-white/90 backdrop-blur-xl shadow-2xl border border-white/60 p-6"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Entry summary</p>
            <p className="text-sm text-muted-foreground">{formatEntryTimestamp(entry.createdAt)}{entry.updatedAt ? " · edited" : ""}</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary/60 text-muted-foreground hover:bg-secondary transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Intensity pill */}
        <div className="mb-5 flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-lavender/40 to-sky/40 px-4 py-2 text-sm font-medium">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Intensity</span>
            <span className="text-2xl font-semibold text-gradient">{entry.intensity}</span>
            <span className="text-muted-foreground text-sm">/ 10</span>
          </div>
        </div>

        {/* Moods */}
        {moodLabels.length > 0 && (
          <ModalSection title="Mood">
            <div className="flex flex-wrap gap-2">
              {moodLabels.map((m) => (
                <span key={m.key} className="rounded-full bg-secondary/70 px-3 py-1 text-sm">
                  {m.emoji} {m.label}
                </span>
              ))}
            </div>
          </ModalSection>
        )}

        {/* Journal */}
        {entry.journal && (
          <ModalSection title="What happened">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{entry.journal}</p>
          </ModalSection>
        )}

        {/* Thoughts */}
        {entry.thoughts && (
          <ModalSection title="Thoughts">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{entry.thoughts}</p>
          </ModalSection>
        )}

        {/* Origin */}
        {entry.origin && (
          <ModalSection title="Origin">
            <p className="text-sm text-foreground">
              {entry.origin}
              {entry.origin === "Other" && entry.originOther ? (
                <span className="block mt-1 text-muted-foreground">{entry.originOther}</span>
              ) : null}
            </p>
          </ModalSection>
        )}

        {/* Body */}
        {entry.body.length > 0 && (
          <ModalSection title="Body sensations">
            <div className="flex flex-wrap gap-2">
              {entry.body.map((b) => (
                <span key={b} className="rounded-full bg-secondary/70 px-3 py-1 text-sm">{b}</span>
              ))}
            </div>
          </ModalSection>
        )}

        {/* Helped */}
        {helpedLabels.length > 0 && (
          <ModalSection title="What helped">
            <div className="flex flex-wrap gap-2">
              {helpedLabels.map((h) => (
                <span key={h.key} className="rounded-full bg-secondary/70 px-3 py-1 text-sm">{h.emoji} {h.key}</span>
              ))}
            </div>
          </ModalSection>
        )}

        {/* Delete */}
        <button
          onClick={() => { onDelete(entry.id); onClose(); }}
          className="mt-6 w-full rounded-2xl border border-red-200 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          Delete this entry
        </button>
      </motion.div>
    </motion.div>
  );
}

function ModalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-2xl bg-secondary/30 p-4">
      <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="glass rounded-3xl p-5"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-lavender to-sky text-lavender-deep">
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-3 text-3xl font-medium">{value}</div>
    </motion.div>
  );
}

function EmptyMini({ cta = false }: { cta?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="text-sm text-muted-foreground">Nothing here yet — and that's okay.</div>
      {cta && (
        <Link href="/checkin">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-lavender-deep to-sky-deep px-5 py-2 text-sm text-white">
            <Plus className="h-4 w-4" /> Start your first check-in
          </span>
        </Link>
      )}
    </div>
  );
}
