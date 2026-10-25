"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type NarrationState = "idle" | "speaking" | "paused" | "timer";

function sentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((item) => item.trim()).filter(Boolean) ?? [];
}

export function useNarration(text: string, rate = 1) {
  const parts = useMemo(() => sentences(text), [text]);
  const voice = useRef<SpeechSynthesisVoice | null>(null);
  const cancelled = useRef(false);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [state, setState] = useState<NarrationState>("idle");
  const [fallback, setFallback] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      const id = globalThis.setTimeout(() => {
        setFallback(true);
        setVoiceReady(true);
      }, 0);
      return () => globalThis.clearTimeout(id);
    }
    const synthesis = window.speechSynthesis;
    const choose = () => {
      const voices = synthesis.getVoices();
      voice.current = voices.find((item) => item.lang.toLowerCase().startsWith("en")) ?? voices[0] ?? null;
      if (voice.current) setVoiceReady(true);
    };
    choose();
    synthesis.addEventListener("voiceschanged", choose);
    const timeout = window.setTimeout(() => {
      if (!voice.current) {
        setFallback(true);
        setVoiceReady(true);
      }
    }, 1500);
    return () => {
      window.clearTimeout(timeout);
      synthesis.removeEventListener("voiceschanged", choose);
    };
  }, []);

  const speakFrom = useCallback((startIndex: number) => {
    if (fallback || !voice.current || !("speechSynthesis" in window)) return;
    cancelled.current = false;
    const synthesis = window.speechSynthesis;
    synthesis.cancel();
    const speakNext = (currentIndex: number) => {
      if (cancelled.current || currentIndex >= parts.length) {
        if (!cancelled.current) setState("idle");
        return;
      }
      setSentenceIndex(currentIndex);
      const utterance = new SpeechSynthesisUtterance(parts[currentIndex]);
      utterance.voice = voice.current;
      utterance.rate = rate;
      utterance.onend = () => speakNext(currentIndex + 1);
      utterance.onerror = () => {
        setFallback(true);
        setState("idle");
      };
      synthesis.speak(utterance);
    };
    setState("speaking");
    speakNext(startIndex);
  }, [fallback, parts, rate]);

  const play = useCallback(() => {
    if (!voiceReady) return;
    if (fallback || !voice.current || !("speechSynthesis" in window)) {
      const remaining = parts.slice(sentenceIndex).join(" ");
      const words = remaining.split(/\s+/).filter(Boolean).length;
      setState("timer");
      window.setTimeout(() => setState("idle"), Math.max(3000, words * 420));
      return;
    }
    speakFrom(sentenceIndex);
  }, [fallback, parts, sentenceIndex, speakFrom, voiceReady]);

  const pause = useCallback(() => {
    if (state !== "speaking") return;
    cancelled.current = true;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setState("paused");
  }, [state]);

  const stop = useCallback(() => {
    cancelled.current = true;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSentenceIndex(0);
    setState("idle");
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [stop]);

  return { state, fallback, voiceReady, play, pause, stop, sentenceIndex, sentenceCount: parts.length };
}
