"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type NarrationState = "idle" | "speaking" | "paused" | "timer";

function sentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((item) => item.trim()).filter(Boolean) ?? [];
}

export function useNarration(text: string, rate = 1, onSentenceStart?: (i: number) => void) {
  const parts = useMemo(() => sentences(text), [text]);
  const voice = useRef<SpeechSynthesisVoice | null>(null);
  const cancelled = useRef(false);
  const timerRef = useRef<number | null>(null);
  const onSentenceStartRef = useRef(onSentenceStart);

  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [state, setState] = useState<NarrationState>("idle");
  const [fallback, setFallback] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);

  // Sync the callback ref
  useEffect(() => {
    onSentenceStartRef.current = onSentenceStart;
  }, [onSentenceStart]);

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

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const speakFrom = useCallback((startIndex: number) => {
    if (fallback || !voice.current || !("speechSynthesis" in window)) return;
    cancelled.current = false;
    clearTimer();
    const synthesis = window.speechSynthesis;
    synthesis.cancel();
    const speakNext = (currentIndex: number) => {
      if (cancelled.current || currentIndex >= parts.length) {
        if (!cancelled.current) setState("idle");
        return;
      }
      setSentenceIndex(currentIndex);
      onSentenceStartRef.current?.(currentIndex);
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
  }, [clearTimer, fallback, parts, rate]);

  const runTimerFrom = useCallback((startIndex: number) => {
    cancelled.current = false;
    clearTimer();
    setState("timer");

    const stepSentence = (currentIndex: number) => {
      if (cancelled.current || currentIndex >= parts.length) {
        if (!cancelled.current) setState("idle");
        return;
      }
      setSentenceIndex(currentIndex);
      onSentenceStartRef.current?.(currentIndex);

      const words = parts[currentIndex].split(/\s+/).filter(Boolean).length;
      // Timer mode (no voice): advance every max(2000, words*380) ms
      const duration = Math.max(2000, Math.round(words * 380));

      timerRef.current = window.setTimeout(() => {
        stepSentence(currentIndex + 1);
      }, duration);
    };

    stepSentence(startIndex);
  }, [clearTimer, parts]);

  const play = useCallback(() => {
    if (!voiceReady) return;
    if (fallback || !voice.current || !("speechSynthesis" in window)) {
      runTimerFrom(sentenceIndex);
      return;
    }
    speakFrom(sentenceIndex);
  }, [fallback, runTimerFrom, sentenceIndex, speakFrom, voiceReady]);

  const pause = useCallback(() => {
    cancelled.current = true;
    clearTimer();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setState("paused");
  }, [clearTimer]);

  const stop = useCallback(() => {
    cancelled.current = true;
    clearTimer();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSentenceIndex(0);
    setState("idle");
  }, [clearTimer]);

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

  return {
    state,
    fallback,
    voiceReady,
    play,
    pause,
    stop,
    sentenceIndex,
    sentenceCount: parts.length,
  };
}
