export type SfxCue = "click" | "correct" | "wrong" | "hit" | "level-up" | "victory" | "boss-phase";

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const audioWindow = window as AudioWindow;
    const Constructor = window.AudioContext ?? audioWindow.webkitAudioContext;
    if (!Constructor) return null;
    context ??= new Constructor();
    if (context.state === "suspended") void context.resume().catch(() => undefined);
    return context;
  } catch {
    return null;
  }
}

const notes: Record<SfxCue, { frequency: number; duration: number; type: OscillatorType }> = {
  click: { frequency: 520, duration: 0.045, type: "square" },
  correct: { frequency: 740, duration: 0.12, type: "triangle" },
  wrong: { frequency: 190, duration: 0.16, type: "square" },
  hit: { frequency: 320, duration: 0.09, type: "square" },
  "level-up": { frequency: 880, duration: 0.22, type: "triangle" },
  victory: { frequency: 988, duration: 0.3, type: "triangle" },
  "boss-phase": { frequency: 260, duration: 0.24, type: "square" },
};

function playTone(audio: AudioContext, cue: SfxCue): void {
  try {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const spec = notes[cue];
    const now = audio.currentTime;
    oscillator.type = spec.type;
    oscillator.frequency.setValueAtTime(spec.frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + spec.duration + 0.01);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  } catch {
    // Audio is optional; blocked or unsupported contexts never interrupt play.
  }
}

export function playSfx(cue: SfxCue, enabled: boolean): void {
  if (!enabled) return;
  const audio = getContext();
  if (!audio) return;
  if (audio.state === "suspended") {
    void audio.resume().then(() => {
      if (audio.state === "running") playTone(audio, cue);
    }).catch(() => undefined);
    return;
  }
  if (audio.state === "running") playTone(audio, cue);
}
