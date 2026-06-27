"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Mic, MicOff, BookHeart, Pencil, Home } from "lucide-react";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BODY_OPTIONS,
  DRAFT_KEY,
  EMPTY_DRAFT,
  HELPED_OPTIONS,
  MOODS,
  ORIGIN_OPTIONS,
  THOUGHT_SUGGESTIONS,
  saveEntry,
  type Draft,
} from "@/lib/data";

const STEPS = ["Mood", "Intensity", "Story", "Thoughts", "Origin", "Body", "Helped", "Review"] as const;

export default function CheckIn() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "Check in — Fragilewhispers";
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setDraft({ ...EMPTY_DRAFT, ...JSON.parse(raw) });
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft, loaded]);

  const update = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const canNext = useMemo(() => {
    if (step === 0) return draft.moods.length > 0;
    return true;
  }, [step, draft]);

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const onSave = async () => {
    setSaving(true);
    await saveEntry(draft);
    localStorage.removeItem(DRAFT_KEY);
    toast.success("Entry saved", { description: "Be gentle with yourself today." });
    router.push("/dashboard");
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <main className="relative min-h-screen pb-32">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-lavender/40 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-sky/30 blur-3xl" />
      </div>

      <header className="relative mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-lavender-deep to-sky-deep text-white">
            <BookHeart className="h-4 w-4" />
          </div>
          <span className="font-display text-base font-medium">Fragilewhispers</span>
        </Link>
        <span className="text-xs text-muted-foreground">
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </span>
      </header>

      <div className="relative mx-auto max-w-3xl px-6">
        <Progress value={progress} className="h-1.5 bg-secondary" />
      </div>

      <section className="relative mx-auto mt-10 max-w-3xl px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 0 && <StepMood draft={draft} update={update} />}
            {step === 1 && <StepIntensity draft={draft} update={update} />}
            {step === 2 && <StepStory draft={draft} update={update} />}
            {step === 3 && <StepThoughts draft={draft} update={update} />}
            {step === 4 && <StepOrigin draft={draft} update={update} />}
            {step === 5 && <StepBody draft={draft} update={update} />}
            {step === 6 && <StepHelped draft={draft} update={update} />}
            {step === 7 && <StepReview draft={draft} goto={setStep} />}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-20">
        <div className="mx-auto max-w-3xl px-6 pb-6">
          <div className="glass flex items-center justify-between rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={back}
                disabled={step === 0}
                className="rounded-full"
              >
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Link href="/">
                <Button variant="ghost" className="rounded-full text-muted-foreground hover:text-foreground">
                  <Home className="mr-1 h-4 w-4" /> Home
                </Button>
              </Link>
            </div>
            {step < STEPS.length - 1 ? (
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={next}
                  disabled={!canNext}
                  className="rounded-full bg-gradient-to-r from-lavender-deep to-sky-deep px-6 text-white hover:opacity-95"
                >
                  Next <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </motion.div>
            ) : (
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={onSave}
                  disabled={saving}
                  className="rounded-full bg-gradient-to-r from-lavender-deep to-sky-deep px-6 text-white hover:opacity-95"
                >
                  <Check className="mr-1 h-4 w-4" /> {saving ? "Saving…" : "Save entry"}
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function StepTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-medium tracking-tight md:text-4xl">{title}</h1>
      {sub && <p className="mt-3 text-base text-muted-foreground">{sub}</p>}
    </div>
  );
}

function StepMood({ draft, update }: { draft: Draft; update: <K extends keyof Draft>(k: K, v: Draft[K]) => void }) {
  const toggle = (k: string) => {
    update("moods", draft.moods.includes(k) ? draft.moods.filter((m) => m !== k) : [...draft.moods, k]);
  };
  return (
    <div>
      <StepTitle title="How are you feeling right now?" sub="Pick as many as feel true. It's okay if they contradict." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MOODS.map((m) => {
          const active = draft.moods.includes(m.key);
          return (
            <motion.button
              key={m.key}
              type="button"
              onClick={() => toggle(m.key)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              animate={active ? { scale: 1.03 } : { scale: 1 }}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-3xl p-6 text-center transition-all",
                active
                  ? "bg-gradient-to-br from-lavender to-sky shadow-[var(--shadow-glow)] ring-2 ring-lavender-deep/40"
                  : "glass hover:shadow-[var(--shadow-soft)]",
              )}
              aria-pressed={active}
              aria-label={m.label}
            >
              <span className="text-4xl">{m.emoji}</span>
              <span className="text-sm font-medium">{m.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function StepIntensity({ draft, update }: { draft: Draft; update: <K extends keyof Draft>(k: K, v: Draft[K]) => void }) {
  return (
    <div>
      <StepTitle title="How intense is your strongest emotion?" sub="Just a feeling — no need to be precise." />
      <div className="glass mt-4 rounded-3xl p-8">
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">About a</div>
          <div className="mt-1 text-7xl font-medium text-gradient">{draft.intensity}</div>
        </div>
        <div className="mt-8 px-1">
          <Slider
            value={[draft.intensity]}
            min={0}
            max={10}
            step={1}
            onValueChange={(v) => update("intensity", v[0] ?? 0)}
            aria-label="Emotion intensity"
          />
        </div>
        <div className="mt-6 grid grid-cols-3 text-xs text-muted-foreground">
          <span>0 · Barely noticeable</span>
          <span className="text-center">5 · Moderate</span>
          <span className="text-right">10 · Extremely intense</span>
        </div>
      </div>
    </div>
  );
}

function StepStory({ draft, update }: { draft: Draft; update: <K extends keyof Draft>(k: K, v: Draft[K]) => void }) {
  const onSpeechResult = useCallback(
    (text: string) => {
      const sep = draft.journal && !draft.journal.endsWith(" ") ? " " : "";
      update("journal", draft.journal + sep + text);
      toast.success("Voice captured", { description: "Your words have been added." });
    },
    [draft.journal, update],
  );

  const { supported, listening, transcript, toggle } = useSpeechToText({
    onResult: onSpeechResult,
  });

  return (
    <div>
      <StepTitle title="What happened?" sub="Don't worry about grammar. Just tell the story." />
      <div className="glass relative rounded-3xl p-2">
        <Textarea
          value={draft.journal}
          onChange={(e) => update("journal", e.target.value)}
          placeholder="Today my teammate ignored my message..."
          className="min-h-[220px] resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
        />

        {/* Live transcript preview */}
        <AnimatePresence>
          {listening && transcript && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="absolute bottom-16 left-4 right-16 rounded-xl bg-lavender/20 px-3 py-2 text-sm text-muted-foreground backdrop-blur-sm"
            >
              <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-red-400" />
              {transcript}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => {
            if (!supported) {
              toast.error("Not supported", {
                description: "Your browser doesn't support speech recognition. Try Chrome or Edge.",
              });
              return;
            }
            toggle();
          }}
          className={cn(
            "absolute bottom-4 right-4 grid h-11 w-11 place-items-center rounded-full text-white shadow-[var(--shadow-soft)] transition-all",
            listening
              ? "animate-pulse bg-red-500 scale-110"
              : "bg-gradient-to-br from-lavender-deep to-sky-deep hover:scale-105",
          )}
          aria-label={listening ? "Stop voice journal" : "Start voice journal"}
        >
          {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
      </div>

      {/* Hint text */}
      {listening && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-center text-xs text-muted-foreground"
        >
          Listening… tap the mic again to stop
        </motion.p>
      )}
    </div>
  );
}

function StepThoughts({ draft, update }: { draft: Draft; update: <K extends keyof Draft>(k: K, v: Draft[K]) => void }) {
  const append = (s: string) => {
    const sep = draft.thoughts && !draft.thoughts.endsWith(" ") ? " " : "";
    update("thoughts", draft.thoughts + sep + s);
  };
  return (
    <div>
      <StepTitle title="What was your mind saying?" sub="Sometimes our thoughts appear automatically." />
      <div className="glass rounded-3xl p-2">
        <Textarea
          value={draft.thoughts}
          onChange={(e) => update("thoughts", e.target.value)}
          placeholder="The voice in your head, on the page..."
          className="min-h-[160px] resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
        />
      </div>
      <div className="mt-5">
        <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Common thoughts</div>
        <div className="flex flex-wrap gap-2">
          {THOUGHT_SUGGESTIONS.map((t) => (
            <motion.button
              key={t}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => append(t)}
              className="rounded-full glass px-4 py-2 text-sm transition-shadow hover:shadow-[var(--shadow-soft)]"
            >
              {t}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepOrigin({ draft, update }: { draft: Draft; update: <K extends keyof Draft>(k: K, v: Draft[K]) => void }) {
  const isOther = draft.origin === "Other";
  return (
    <div>
      <StepTitle title="Where do you think this thought comes from?" sub="Just a guess is enough." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[...ORIGIN_OPTIONS, "Other"].map((o) => {
          const active = draft.origin === o;
          return (
            <motion.button
              key={o}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => update("origin", o)}
              className={cn(
                "rounded-2xl p-5 text-left transition-all",
                active
                  ? "bg-gradient-to-br from-lavender to-sky shadow-[var(--shadow-glow)] ring-2 ring-lavender-deep/40"
                  : "glass hover:shadow-[var(--shadow-soft)]",
              )}
            >
              <span className="text-sm font-medium">{o}</span>
            </motion.button>
          );
        })}
      </div>
      <AnimatePresence>
        {isOther && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <div className="glass rounded-3xl p-2">
              <Textarea
                value={draft.originOther ?? ""}
                onChange={(e) => update("originOther", e.target.value)}
                placeholder="Tell me a little more..."
                className="min-h-[100px] resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepBody({ draft, update }: { draft: Draft; update: <K extends keyof Draft>(k: K, v: Draft[K]) => void }) {
  const toggle = (k: string) => {
    update("body", draft.body.includes(k) ? draft.body.filter((m) => m !== k) : [...draft.body, k]);
  };
  return (
    <div>
      <StepTitle title="How did your body feel?" sub="The body keeps the score. Notice gently." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {BODY_OPTIONS.map((b) => {
          const active = draft.body.includes(b);
          return (
            <motion.button
              key={b}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggle(b)}
              className={cn(
                "flex items-center justify-between rounded-2xl p-4 text-left transition-all",
                active
                  ? "bg-gradient-to-br from-lavender to-sky ring-2 ring-lavender-deep/40"
                  : "glass hover:shadow-[var(--shadow-soft)]",
              )}
              aria-pressed={active}
            >
              <span className="text-sm font-medium">{b}</span>
              <span
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-full border transition-colors",
                  active ? "border-transparent bg-lavender-deep text-white" : "border-border bg-white/70",
                )}
              >
                {active && <Check className="h-3.5 w-3.5" />}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function StepHelped({ draft, update }: { draft: Draft; update: <K extends keyof Draft>(k: K, v: Draft[K]) => void }) {
  const toggle = (k: string) => {
    update("helped", draft.helped.includes(k) ? draft.helped.filter((m) => m !== k) : [...draft.helped, k]);
  };
  return (
    <div>
      <StepTitle title="What helped?" sub="Even a little. Even 'nothing yet' is honest." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {HELPED_OPTIONS.map((h) => {
          const active = draft.helped.includes(h.key);
          return (
            <motion.button
              key={h.key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => toggle(h.key)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-3xl p-6 transition-all",
                active
                  ? "bg-gradient-to-br from-lavender to-sky shadow-[var(--shadow-glow)] ring-2 ring-lavender-deep/40"
                  : "glass hover:shadow-[var(--shadow-soft)]",
              )}
              aria-pressed={active}
            >
              <span className="text-3xl">{h.emoji}</span>
              <span className="text-sm font-medium">{h.key}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function StepReview({ draft, goto }: { draft: Draft; goto: (n: number) => void }) {
  const Section = ({ title, step, children }: { title: string; step: number; children: React.ReactNode }) => (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{title}</div>
        <button
          onClick={() => goto(step)}
          className="inline-flex items-center gap-1 text-xs text-lavender-deep hover:underline"
        >
          <Pencil className="h-3 w-3" /> Edit
        </button>
      </div>
      <div className="mt-2 text-sm text-foreground">{children}</div>
    </div>
  );
  const moodLabels = draft.moods
    .map((k) => MOODS.find((m) => m.key === k))
    .filter(Boolean) as { label: string; emoji: string }[];
  return (
    <div>
      <StepTitle
        title="A gentle review"
        sub={`Read it back. Edit anything that doesn't ring true. This will be saved with today's date and time — ${new Date().toLocaleString(
          undefined,
          { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
        )}.`}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Section title="Mood" step={0}>
          {moodLabels.length ? (
            <div className="flex flex-wrap gap-2">
              {moodLabels.map((m) => (
                <Badge key={m.label} variant="secondary" className="rounded-full bg-secondary/70 px-3 py-1">
                  <span className="mr-1">{m.emoji}</span> {m.label}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Section>
        <Section title="Intensity" step={1}>
          <span className="text-2xl font-medium">{draft.intensity}</span>
          <span className="ml-2 text-muted-foreground">/ 10</span>
        </Section>
        <Section title="What happened" step={2}>
          {draft.journal || <span className="text-muted-foreground">—</span>}
        </Section>
        <Section title="Thoughts" step={3}>
          {draft.thoughts || <span className="text-muted-foreground">—</span>}
        </Section>
        <Section title="Origin" step={4}>
          {draft.origin ? (
            <>
              {draft.origin}
              {draft.origin === "Other" && draft.originOther ? <div className="mt-1 text-muted-foreground">{draft.originOther}</div> : null}
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Section>
        <Section title="Body" step={5}>
          {draft.body.length ? (
            <div className="flex flex-wrap gap-2">
              {draft.body.map((b) => (
                <Badge key={b} variant="secondary" className="rounded-full bg-secondary/70 px-3 py-1">{b}</Badge>
              ))}
            </div>
          ) : <span className="text-muted-foreground">—</span>}
        </Section>
        <Section title="What helped" step={6}>
          {draft.helped.length ? (
            <div className="flex flex-wrap gap-2">
              {draft.helped.map((h) => (
                <Badge key={h} variant="secondary" className="rounded-full bg-secondary/70 px-3 py-1">{h}</Badge>
              ))}
            </div>
          ) : <span className="text-muted-foreground">—</span>}
        </Section>
      </div>
    </div>
  );
}
