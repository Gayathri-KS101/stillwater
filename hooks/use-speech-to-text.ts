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

  // Check support on mount
  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const start = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    // Stop any existing recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    const recognition = new SR();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    let finalTranscript = "";

    recognition.onstart = () => {
      setListening(true);
      setTranscript("");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }

      const currentTranscript = (finalTranscript + interim).trim();
      setTranscript(currentTranscript);
      onInterim?.(currentTranscript);
    };

    recognition.onerror = (event: any) => {
      // "aborted" is expected when we manually stop
      if (event.error !== "aborted") {
        console.warn("Speech recognition error:", event.error);
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      const trimmed = finalTranscript.trim();
      if (trimmed) {
        onResult?.(trimmed);
      }
    };

    recognition.start();
  }, [lang, onResult, onInterim]);

  const stop = useCallback(() => {
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
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  return { supported, listening, transcript, start, stop, toggle };
}
