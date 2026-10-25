"use client";

import { useEffect, useState } from "react";
import type { Scene } from "@/lib/schemas";
import { useNarration } from "@/hooks/useNarration";
import { Diagram } from "@/components/diagrams/Diagrams";

export function VideoPlayer({ scenes }: { scenes: Scene[] }) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [captions, setCaptions] = useState(true);
  const scene = scenes[sceneIndex];
  const move = (step: number) => setSceneIndex((current) => Math.max(0, Math.min(scenes.length - 1, current + step)));
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(event.target.tagName)) return;
      if (event.key === "ArrowLeft") setSceneIndex((current) => Math.max(0, current - 1));
      if (event.key === "ArrowRight") setSceneIndex((current) => Math.min(scenes.length - 1, current + 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [scenes.length]);
  if (!scene) return <p>No narrated scenes are available.</p>;
  return <section className="video-player" aria-label="Narrated slideshow using your browser's voice">
    <header className="video-header"><div><p className="eyebrow">Scene {sceneIndex + 1} of {scenes.length}</p><h2>Learning scene</h2></div><span className="video-label">Narrated slideshow using your browser&apos;s voice</span></header>
    <NarratedScene key={sceneIndex} scene={scene} rate={speed} captions={captions} />
    <div className="video-controls">
      <button className="button button-secondary" onClick={() => move(-1)} disabled={sceneIndex === 0} aria-label="Previous scene">◀</button>
      <NarrationControls rate={speed} onRateChange={setSpeed} />
      <button className="button button-secondary" onClick={() => move(1)} disabled={sceneIndex === scenes.length - 1} aria-label="Next scene">▶</button>
      <label className="video-setting">Captions <input type="checkbox" checked={captions} onChange={(event) => setCaptions(event.target.checked)} /></label>
    </div>
    <div className="scene-dots" aria-label="Choose scene">{scenes.map((item, index) => <button key={`${index}-${item.visual}`} className={index === sceneIndex ? "active" : ""} aria-label={`Scene ${index + 1}`} aria-current={index === sceneIndex ? "step" : undefined} onClick={() => setSceneIndex(index)} />)}</div>
  </section>;
}

function NarratedScene({ scene, rate, captions }: { scene: Scene; rate: number; captions: boolean }) {
  const narration = useNarration(scene.narration, rate);
  const { state, play, pause, voiceReady, fallback } = narration;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(event.target.tagName)) return;
      if (event.key === " ") {
        event.preventDefault();
        if (state === "speaking") pause();
        else play();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pause, play, state]);

  return <>
    <div className="video-canvas parchment">
      <h3>{scene.visual === "text" ? "The idea" : scene.visual}</h3>
      {captions && <p className="video-caption">{scene.narration}</p>}
      <Diagram kind={scene.visual} data={scene.visualData} />
    </div>
    <div className="narration-buttons">
      {state === "speaking" ? <button className="button button-primary" onClick={pause}>Pause</button> : <button className="button button-primary" onClick={play} disabled={!voiceReady}>Play</button>}
      {fallback && <p className="narration-fallback" role="status">Browser narration is unavailable, so this scene uses a reading-time timer.</p>}
      {state === "timer" && <p className="narration-fallback" role="status">Reading time…</p>}
    </div>
  </>;
}

function NarrationControls({ rate, onRateChange }: { rate: number; onRateChange: (rate: number) => void }) {
  return <label className="video-setting">Speed <select value={rate} onChange={(event) => onRateChange(Number(event.target.value))}><option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option></select></label>;
}
