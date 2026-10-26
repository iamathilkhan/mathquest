"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { Scene, WorkedExample } from "@/lib/schemas";
import { useNarration } from "@/hooks/useNarration";
import { Diagram } from "@/components/diagrams/Diagrams";
import { buildExampleScene, alignSteps } from "@/lib/visual/timeline";
import { planFromExpression, type Plan } from "@/lib/visual/plan";
import { FractionAddSubAnim } from "@/components/diagrams/anim/FractionAddSubAnim";
import { DecimalGridAnim } from "@/components/diagrams/anim/DecimalGridAnim";

function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((item) => item.trim()).filter(Boolean) ?? [text];
}

export function VideoPlayer({
  scenes,
  workedExamples = [],
}: {
  scenes: Scene[];
  workedExamples?: WorkedExample[];
}) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [captions, setCaptions] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(() => {
    // Initialize from system preference
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });

  // Listen for changes to reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Append up to 2 "Watch the example" scenes after the existing scenes
  const allScenes = useMemo(() => {
    const list = [...scenes];
    let appended = 0;
    for (const ex of workedExamples) {
      if (appended >= 2) break;
      const exampleScene = buildExampleScene(ex);
      if (exampleScene) {
        list.push(exampleScene);
        appended++;
      }
    }
    return list;
  }, [scenes, workedExamples]);

  const scene = allScenes[sceneIndex];

  const move = useCallback((step: number) =>
    setSceneIndex((current) => Math.max(0, Math.min(allScenes.length - 1, current + step))), [allScenes.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(event.target.tagName)
      ) {
        return;
      }
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [move]);

  if (!scene) return <p>No narrated scenes are available.</p>;

  const hasExamplePlan = Boolean(
    scene.visualData &&
      typeof scene.visualData === "object" &&
      ("animKind" in scene.visualData || "expression" in scene.visualData)
  );

  return (
    <section className="video-player" aria-label="Narrated slideshow using your browser's voice">
      <header className="video-header">
        <div>
          <p className="eyebrow">
            Scene {sceneIndex + 1} of {allScenes.length}
          </p>
          <h2>{hasExamplePlan ? "Watch the example" : "Learning scene"}</h2>
        </div>
        <span className="video-label">Narrated slideshow using your browser&apos;s voice</span>
      </header>

      <NarratedScene
        key={sceneIndex}
        scene={scene}
        rate={speed}
        captions={captions}
        reducedMotion={reducedMotion}
      />

      <div className="video-controls">
        <button
          className="button button-secondary"
          onClick={() => move(-1)}
          disabled={sceneIndex === 0}
          aria-label="Previous scene"
        >
          ◀
        </button>
        <NarrationControls rate={speed} onRateChange={setSpeed} />
        <button
          className="button button-secondary"
          onClick={() => move(1)}
          disabled={sceneIndex === allScenes.length - 1}
          aria-label="Next scene"
        >
          ▶
        </button>
        <label className="video-setting">
          Captions{" "}
          <input
            type="checkbox"
            checked={captions}
            onChange={(event) => setCaptions(event.target.checked)}
          />
        </label>
        <label className="video-setting">
          Reduced Motion{" "}
          <input
            type="checkbox"
            checked={reducedMotion}
            onChange={(event) => setReducedMotion(event.target.checked)}
          />
        </label>
      </div>

      <div className="scene-dots" aria-label="Choose scene">
        {allScenes.map((item, index) => (
          <button
            key={`${index}-${item.visual}`}
            className={index === sceneIndex ? "active" : ""}
            aria-label={`Scene ${index + 1}`}
            aria-current={index === sceneIndex ? "step" : undefined}
            onClick={() => setSceneIndex(index)}
          />
        ))}
      </div>
    </section>
  );
}

function NarratedScene({
  scene,
  rate,
  captions,
  reducedMotion,
}: {
  scene: Scene;
  rate: number;
  captions: boolean;
  reducedMotion: boolean;
}) {
  const sentencesList = useMemo(() => splitSentences(scene.narration), [scene.narration]);

  // Extract or generate Plan
  const plan: Plan | null = useMemo(() => {
    const vdata = scene.visualData as Record<string, unknown> | undefined;
    if (vdata && "plan" in vdata && vdata.plan && typeof vdata.plan === "object") {
      return vdata.plan as Plan;
    }
    if (vdata && "expression" in vdata && typeof vdata.expression === "string") {
      return planFromExpression(vdata.expression);
    }
    return planFromExpression(scene.visual);
  }, [scene]);

  // Alignment: narration sentence index picks the step
  const stepIndices = useMemo(() => {
    if (!plan) return new Array(sentencesList.length).fill(0);
    return alignSteps(plan.steps.length, sentencesList.length);
  }, [plan, sentencesList.length]);

  const [currentSentence, setCurrentSentence] = useState(0);

  const narration = useNarration(scene.narration, rate, (idx) => {
    setCurrentSentence(idx);
  });

  const { state, play, pause, voiceReady, fallback, sentenceIndex } = narration;

  // Sync sentence index when narration updates or manual step
  const activeSentence = sentenceIndex !== undefined ? sentenceIndex : currentSentence;
  const currentStep = stepIndices[activeSentence] ?? 0;
  const isSpeaking = state === "speaking" || state === "timer";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(event.target.tagName)
      ) {
        return;
      }
      if (event.key === " ") {
        event.preventDefault();
        if (state === "speaking") pause();
        else play();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pause, play, state]);

  // Step-through manual controls for reduced motion
  const stepManual = (delta: number) => {
    pause();
    const nextSentence = Math.max(0, Math.min(sentencesList.length - 1, activeSentence + delta));
    setCurrentSentence(nextSentence);
  };

  return (
    <>
      <div className="video-canvas parchment">
        <h3>
          {plan
            ? plan.kind === "fractionAddSub"
              ? "Fraction Addition / Subtraction"
              : "Decimal Grid"
            : scene.visual === "text"
            ? "The idea"
            : scene.visual}
        </h3>

        {/* Speech bubble with current sentence highlighted and mentor bobbing */}
        {captions && (
          <div className="speech-bubble" role="region" aria-label="Speech bubble">
            <div className={`mentor-avatar ${isSpeaking && !reducedMotion ? "mentor-speaking-bob" : ""}`}>
              <span className="mentor-icon" aria-hidden="true">🧙</span>
            </div>
            <div className="speech-bubble-text">
              {sentencesList.map((sentence, index) => (
                <span
                  key={index}
                  className={index === activeSentence ? "sentence-highlight active" : "sentence-dim"}
                >
                  {sentence}{" "}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Visual rendering: pure function of stateAt(plan, alignSteps(...)[sentence]) */}
        <div className="video-diagram-render">
          {plan ? (
            plan.kind === "fractionAddSub" ? (
              <FractionAddSubAnim
                plan={plan}
                step={currentStep}
                reducedMotion={reducedMotion}
              />
            ) : (
              <DecimalGridAnim
                plan={plan}
                step={currentStep}
                reducedMotion={reducedMotion}
              />
            )
          ) : (
            <Diagram kind={scene.visual} data={scene.visualData} step={currentStep} reducedMotion={reducedMotion} />
          )}
        </div>

        {/* Reduced motion step-through buttons */}
        {reducedMotion && (
          <div className="reduced-step-controls">
            <button
              className="button button-secondary"
              onClick={() => stepManual(-1)}
              disabled={activeSentence === 0}
            >
              ← Step Back
            </button>
            <span className="step-counter">
              Step {currentStep + 1} of {plan ? plan.steps.length : sentencesList.length}
            </span>
            <button
              className="button button-secondary"
              onClick={() => stepManual(1)}
              disabled={activeSentence === sentencesList.length - 1}
            >
              Step Forward →
            </button>
          </div>
        )}
      </div>

      <div className="narration-buttons">
        {state === "speaking" ? (
          <button className="button button-primary" onClick={pause}>
            Pause
          </button>
        ) : (
          <button className="button button-primary" onClick={play} disabled={!voiceReady}>
            Play
          </button>
        )}
        {fallback && (
          <p className="narration-fallback" role="status">
            Browser narration is unavailable, so this scene uses a reading-time timer.
          </p>
        )}
        {state === "timer" && (
          <p className="narration-fallback" role="status">
            Reading time…
          </p>
        )}
      </div>
    </>
  );
}

function NarrationControls({ rate, onRateChange }: { rate: number; onRateChange: (rate: number) => void }) {
  return (
    <label className="video-setting">
      Speed{" "}
      <select value={rate} onChange={(event) => onRateChange(Number(event.target.value))}>
        <option value="0.75">0.75×</option>
        <option value="1">1×</option>
        <option value="1.25">1.25×</option>
      </select>
    </label>
  );
}
