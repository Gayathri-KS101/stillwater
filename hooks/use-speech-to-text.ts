"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseSpeechToTextOptions {
  /** Called with the final transcript when speech ends or is stopped */
  onResult?: (transcript: string) => void;
  /** Called with interim (live) transcript while speaking */
  onInterim?: (transcript: string) => void;
  /** Language for recognition (default: "en-US") */
  lang?: string;
}

interface UseSpeechToTextReturn {
  /** Whether the browser supports the Web Speech API */
  supported: boolean;
  /** Whether we're currently listening */
  listening: boolean;
  /** The current interim transcript */
  transcript: string;
  /** Start listening */
  start: () => void;
  /** Stop listening */
  stop: () => void;
  /** Toggle listening */
  toggle: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionType = any;

export function useSpeechToText({
  onResult,
  onInterim,
  lang = "en-US",
}: UseSpeechToTextOptions = {}): UseSpeechToTextReturn {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionType>(null);

  // Whether the user intends to keep recording (vs. a natural silence pause)
  const intentActiveRef = useRef(false);
  // Accumulate all finalized text across auto-restart sessions
  const allFinalizedRef = useRef("");

  // Keep latest callbacks in refs to avoid re-creating recognition on every render
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const onInterimRef = useRef(onInterim);
  onInterimRef.current = onInterim;

  // Check support on mount
  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const startSession = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    // Abort any existing instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    const recognition = new SR();
    recognition.lang = lang;
    recognition.interimResults = true;
    // Use NON-continuous mode so the API stops cleanly on silence
    // instead of looping and emitting duplicate text.
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event: any) => {
      let sessionFinal = "";
      let interim = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          sessionFinal += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      const currentDisplay = (allFinalizedRef.current + (sessionFinal || interim)).trim();
      setTranscript(currentDisplay);
      onInterimRef.current?.(currentDisplay);

      // When the result is finalized, append it to our accumulated text
      if (sessionFinal) {
        const sep = allFinalizedRef.current && !allFinalizedRef.current.endsWith(" ") ? " " : "";
        allFinalizedRef.current += sep + sessionFinal;
      }
    };

    recognition.onerror = (event: any) => {
      // "aborted" and "no-speech" are expected during normal usage
      if (event.error !== "aborted" && event.error !== "no-speech") {
        console.warn("Speech recognition error:", event.error);
      }
      // On "no-speech", we still want to auto-restart below
      if (event.error !== "no-speech" && event.error !== "aborted") {
        intentActiveRef.current = false;
        setListening(false);
      }
    };

    recognition.onend = () => {
      // If user still wants to record, auto-restart after natural silence pause
      if (intentActiveRef.current) {
        try {
          // Small delay to avoid rapid restart loops
          setTimeout(() => {
            if (intentActiveRef.current) {
              startSession();
            } else {
              setListening(false);
            }
          }, 100);
        } catch {
          setListening(false);
        }
        return;
      }

      // User manually stopped — deliver final result
      setListening(false);
      const trimmed = allFinalizedRef.current.trim();
      if (trimmed) {
        onResultRef.current?.(trimmed);
      }
    };

    recognition.start();
  }, [lang]);

  const start = useCallback(() => {
    allFinalizedRef.current = "";
    setTranscript("");
    intentActiveRef.current = true;
    startSession();
  }, [startSession]);

  const stop = useCallback(() => {
    intentActiveRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const toggle = useCallback(() => {
    if (listening) {
      stop();
    } else {
      start();
    }
  }, [listening, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intentActiveRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  return { supported, listening, transcript, start, stop, toggle };
}
