"use client";

import { useEffect } from "react";

import type { BattleAction } from "@/lib/game/battle";

export function useKeyboardAnswers(dispatch: React.Dispatch<BattleAction>, onAnswer?: (index: number) => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const optionByKey: Record<string, number> = {
        a: 0,
        1: 0,
        b: 1,
        2: 1,
        c: 2,
        3: 2,
        d: 3,
        4: 3,
      };

      if (key in optionByKey) {
        event.preventDefault();
        onAnswer?.(optionByKey[key]);
        dispatch({ type: "ANSWER", picked: optionByKey[key] });
      }

      if (key === "enter" || key === " ") {
        event.preventDefault();
        dispatch({ type: "NEXT" });
      }

      if (key === "h") dispatch({ type: "POWER", item: "hint" });
      if (key === "s") dispatch({ type: "POWER", item: "shield" });
      if (key === "f") dispatch({ type: "POWER", item: "fifty" });
      if (key === "p") dispatch({ type: "SPECIAL" });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, onAnswer]);
}
