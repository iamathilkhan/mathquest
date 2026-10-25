"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { ArtImage } from "@/components/ArtImage";
import {
  HERO_CLASSES,
  getHeroesByVariant,
  getDefaultHeroName,
  heroPortraitSlotId,
  type Hero,
} from "@/data/heroes";
import type { CharacterArtSlot } from "@/data/artManifest";
import { useGameStore } from "@/store/gameStore";
import type { Variant } from "@/data/heroes";

type Step = "name" | "style" | "hero";

interface HeroCreationFlowProps {
  isNewGame?: boolean;
  onComplete?: () => void;
}

export function HeroCreationFlow({ isNewGame = true, onComplete }: HeroCreationFlowProps) {
  const router = useRouter();
  const setHero = useGameStore((state) => state.setHero);
  const changeHero = useGameStore((state) => state.changeHero);
  const startNewGame = useGameStore((state) => state.startNewGame);

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [heroStyle, setHeroStyle] = useState<Variant | "any">("any");
  const [selectedHero, setSelectedHero] = useState<Hero | null>(null);
  const [showCancel, setShowCancel] = useState(false);

  const availableHeroes = getHeroesByVariant(heroStyle);

  const handleNameChange = (value: string) => {
    const cleaned = value.replace(/[^A-Za-z0-9 ]/g, "").slice(0, 20);
    setName(cleaned);
  };

  const handleStyleSelect = (style: Variant | "any") => {
    setHeroStyle(style);
    setStep("hero");
  };

  const handleHeroSelect = (hero: Hero) => {
    setSelectedHero(hero);
  };

  const handleConfirm = () => {
    if (!selectedHero) return;

    const resolvedName = name.trim() || getDefaultHeroName(selectedHero.classId, selectedHero.variant);
    if (isNewGame) {
      startNewGame(resolvedName);
      setHero(selectedHero);
    } else {
      changeHero(selectedHero);
      if (name.trim()) {
        useGameStore.setState((s) => ({
          player: {
            ...s.player,
            profile: { ...s.player.profile, name: resolvedName, grade: s.player.profile?.grade ?? 5 },
          },
        }));
      }
    }

    if (onComplete) {
      onComplete();
    } else if (isNewGame) {
      router.push("/grade");
    } else {
      router.back();
    }
  };

  const handleCancel = () => {
    if (step === "name") {
      router.back();
    } else if (step === "style") {
      setStep("name");
    } else {
      setStep("style");
    }
  };

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowCancel(true);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <div className="hero-creation-flow panel">
      {step === "name" && (
        <div className="creation-step">
          <p className="eyebrow">Your adventure begins</p>
          <h2>Choose a name (optional)</h2>
          <label className="field-label" htmlFor="hero-name">
            Name (max 20 characters)
          </label>
          <input
            id="hero-name"
            maxLength={20}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Leave blank for default"
            autoFocus
            className="creation-input"
          />
          <p className="body-copy small" style={{ marginTop: "8px", color: "#9ca3af" }}>
            Tip: you can always change your hero later
          </p>
          <div className="button-row" style={{ marginTop: "24px" }}>
            <button className="button button-quiet" onClick={handleCancel}>
              Back
            </button>
            <button
              className="button button-primary"
              onClick={() => setStep("style")}
              autoFocus={name.length > 0}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === "style" && (
        <div className="creation-step">
          <p className="eyebrow">Your hero style</p>
          <h2>Show me...</h2>
          <p className="body-copy" style={{ marginBottom: "20px", color: "#c3cbe0" }}>
            This only changes which heroes you see. It stays on your device.
          </p>
          <div className="style-choices">
            {["Boy", "Girl", "Any"].map((label, i) => {
              const value = (label.toLowerCase() === "any" ? "any" : label.toLowerCase()) as
                | Variant
                | "any";
              return (
                <button
                  key={value}
                  className={`style-choice ${heroStyle === value ? "selected" : ""}`}
                  onClick={() => handleStyleSelect(value)}
                  autoFocus={i === 0}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="button-row" style={{ marginTop: "24px" }}>
            <button className="button button-quiet" onClick={handleCancel}>
              Back
            </button>
          </div>
        </div>
      )}

      {step === "hero" && (
        <div className="creation-step">
          <p className="eyebrow">Choose your hero</p>
          <h2>Who will you be?</h2>
          <div className="hero-cards">
            {availableHeroes.map((hero) => {
              const heroClass = HERO_CLASSES[hero.classId];
              const isSelected = selectedHero?.classId === hero.classId && selectedHero?.variant === hero.variant;
              const defaultName = getDefaultHeroName(hero.classId, hero.variant);
              const portraitSlot = heroPortraitSlotId(hero);

              return (
                <button
                  key={`${hero.classId}-${hero.variant}`}
                  className={`hero-card radio-card ${isSelected ? "selected" : ""}`}
                  onClick={() => handleHeroSelect(hero)}
                  role="radio"
                  aria-checked={isSelected}
                >
                  <div className="hero-card-header">
                    <div className="hero-portrait-frame">
                      <ArtImage
                        slot={portraitSlot as CharacterArtSlot}
                        className="hero-portrait"
                        fallback={defaultName}
                      />
                    </div>
                    <div className="hero-card-title">
                      <h3>{heroClass.displayName}</h3>
                      <p className="small">{defaultName}</p>
                    </div>
                  </div>
                  <div className="hero-card-details">
                    <p>
                      <strong>Passive:</strong> {heroClass.passive.name}
                    </p>
                    <p>{heroClass.passive.text}</p>
                    <p>
                      <strong>Special:</strong> {heroClass.special.name}
                    </p>
                    <p>{heroClass.special.text}</p>
                    <p className="small" style={{ marginTop: "8px", color: "#9ca3af" }}>
                      Strong vs: {heroClass.favouredRealms.map((id) => `${id.split("-")[1]}`).join(", ")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="button-row" style={{ marginTop: "24px" }}>
            <button className="button button-quiet" onClick={handleCancel}>
              Back
            </button>
            <button
              className="button button-primary"
              onClick={handleConfirm}
              disabled={!selectedHero}
            >
              {isNewGame ? "Begin Journey" : "Change Hero"}
            </button>
          </div>
        </div>
      )}

      {showCancel && (
        <div className="scrim" role="presentation" onClick={() => setShowCancel(false)}>
          <section className="dialog panel" role="dialog" aria-modal="true">
            <p className="eyebrow">Cancel?</p>
            <h2>Stop creating your hero?</h2>
            <div className="button-row">
              <button className="button button-quiet" onClick={() => setShowCancel(false)}>
                Keep going
              </button>
              <button className="button button-primary" onClick={() => router.back()}>
                Exit
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
