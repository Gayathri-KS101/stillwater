"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookHeart, Flame, NotebookPen, Activity, Plus, ArrowRight, Trash2, Sheet, CheckCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { toast } from "sonner";
import {
  computeStreak,
  deleteEntry,
  formatEntryTimestamp,
  loadEntries,
  syncAllEntriesToSheets,
  MOODS,
  type JournalEntry,
} from "@/lib/data";

const COLORS = ["#a78bfa", "#7dd3fc", "#fca5a5", "#fcd34d", "#86efac", "#f0abfc", "#fdba74", "#a5b4fc", "#fda4af"];

export default function Dashboard() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  const hasWebhook = !!process.env.NEXT_PUBLIC_SHEETS_WEBHOOK;

  useEffect(() => {
    document.title = "Your journal — Fragilewhispers";
    loadEntries()
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  const streak = useMemo(() => computeStreak(entries), [entries]);
  const avgIntensity = useMemo(
    () => (entries.length ? entries.reduce((a, e) => a + e.intensity, 0) / entries.length : 0),
    [entries],
  );

  const last14 = useMemo(() => {
    const days: { day: string; intensity: number }[] = [];
    const map = new Map<string, number[]>();
    for (const e of entries) {
      const key = new Date(e.timestamp).toDateString();
      map.set(key, [...(map.get(key) ?? []), e.intensity]);
    }
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const vals = map.get(d.toDateString()) ?? [];
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      days.push({ day: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2), intensity: Number(avg.toFixed(1)) });
    }
    return days;
  }, [entries]);

  const moodDist = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) for (const m of e.moods) counts.set(m, (counts.get(m) ?? 0) + 1);
    return MOODS.map((m) => ({ name: m.label, value: counts.get(m.key) ?? 0, emoji: m.emoji })).filter((m) => m.value > 0);
  }, [entries]);

  const onDelete = async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await deleteEntry(id);
    toast("Entry removed");
  };

  const onExportAll = async () => {
    if (syncing || entries.length === 0) return;
    setSyncing(true);
    setSyncProgress(0);
    const { synced, failed } = await syncAllEntriesToSheets(entries, (done, total) => {
      setSyncProgress(Math.round((done / total) * 100));
    });
    setSyncing(false);
    if (failed === 0) {
      toast.success(`${synced} ${synced === 1 ? "entry" : "entries"} synced to Google Sheets ✓`);
    } else {
      toast(`Synced ${synced}, failed ${failed}`, { description: "Check your webhook URL in .env.local" });
    }
  };

  return (
    <main className="relative min-h-screen pb-24">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-0 h-96 w-96 rounded-full bg-lavender/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-sky/30 blur-3xl" />
      </div>

      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-lavender-deep to-sky-deep text-white">
            <BookHeart className="h-4 w-4" />
          </div>
          <span className="font-display text-base font-medium">Fragilewhispers</span>
        </Link>
        <div className="flex items-center gap-3">
          {hasWebhook && (
            <motion.button
              whileHover={{ scale: syncing ? 1 : 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onExportAll}
              disabled={syncing || entries.length === 0}
              title="Export all entries to Google Sheets"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/60 px-4 py-2 text-sm font-medium text-foreground shadow-sm backdrop-blur-sm transition-all hover:bg-white/80 disabled:opacity-50"
            >
              {syncing ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-lavender-deep" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {syncProgress}%
                </>
              ) : (
                <>
                  <Sheet className="h-4 w-4 text-green-600" />
                  Export to Sheets
                </>
              )}
            </motion.button>
          )}
          <Link href="/checkin">
            <motion.span
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-lavender-deep to-sky-deep px-5 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-soft)]"
            >
              <Plus className="h-4 w-4" /> New check-in
            </motion.span>
          </Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-5xl px-6 pt-6">
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
          <Stat icon={<Activity className="h-4 w-4" />} label="Avg intensity" value={avgIntensity ? avgIntensity.toFixed(1) : "—"} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="glass rounded-3xl p-6 lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-medium">Intensity, last 14 days</h2>
              <span className="text-xs text-muted-foreground">Daily average</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last14} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#7dd3fc" />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#7a7090" }} />
                  <YAxis domain={[0, 10]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#7a7090" }} />
                  <Tooltip
                    cursor={{ fill: "rgba(167,139,250,0.08)" }}
                    contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }}
                  />
                  <Bar dataKey="intensity" fill="url(#bar)" radius={[8, 8, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-3xl p-6 lg:col-span-2">
            <h2 className="mb-4 text-base font-medium">Mood distribution</h2>
            {moodDist.length ? (
              <div className="flex items-center gap-4">
                <div className="h-48 w-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={moodDist} dataKey="value" innerRadius={42} outerRadius={72} paddingAngle={2}>
                        {moodDist.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="white" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="flex-1 space-y-1.5 text-sm">
                  {moodDist.slice(0, 6).map((m, i) => (
                    <li key={m.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span>{m.emoji} {m.name}</span>
                      </span>
                      <span className="text-muted-foreground">{m.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyMini />
            )}
          </div>
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
                <li key={e.id} className="flex items-start justify-between gap-4 py-4">
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
                      onClick={() => onDelete(e.id)}
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
    </main>
  );
}

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
