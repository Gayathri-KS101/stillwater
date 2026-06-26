"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, BookHeart } from "lucide-react";

export default function Index() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Ambient orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-lavender/50 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-sky/40 blur-3xl" />
      </div>

      <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-lavender-deep to-sky-deep text-white shadow-[var(--shadow-soft)]">
            <BookHeart className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-medium tracking-tight">FragileWhispers</span>
        </div>
        <Link href="/dashboard" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          Your journal
        </Link>
      </nav>

      <section className="relative mx-auto flex max-w-3xl flex-col items-center px-6 pt-16 pb-24 text-center md:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-muted-foreground"
        >
          <Sparkles className="h-3.5 w-3.5 text-lavender-deep" />
          A quiet moment, just for you
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mt-8 text-5xl font-medium leading-[1.05] tracking-tight md:text-7xl"
        >
          How are you{" "}
          <span className="text-gradient italic">feeling</span>{" "}
          today?
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl"
        >
          Take a moment. There are no right or wrong answers — only the truth of this exact moment.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-12 flex flex-col items-center gap-4 sm:flex-row"
        >
          <Link href="/checkin">
            <motion.span
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-lavender-deep to-sky-deep px-8 py-4 text-base font-medium text-white shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-glow)] transition-shadow"
            >
              Start check-in
              <ArrowRight className="h-4 w-4" />
            </motion.span>
          </Link>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            or view past entries →
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="mt-24 grid w-full grid-cols-1 gap-4 md:grid-cols-3"
        >
          {[
            { t: "Private", d: "Everything stays on your device. Always." },
            { t: "Gentle", d: "A conversation, never a form to fill out." },
            { t: "Reflective", d: "Notice patterns over time, on your terms." },
          ].map((f) => (
            <div key={f.t} className="glass rounded-3xl p-5 text-left">
              <div className="text-sm font-medium">{f.t}</div>
              <div className="mt-1 text-sm text-muted-foreground">{f.d}</div>
            </div>
          ))}
        </motion.div>
      </section>
    </main>
  );
}
