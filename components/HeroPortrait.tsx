"use client";

/**
 * components/HeroPortrait.tsx
 *
 * Hero portrait: tries the portrait art slot; on failure shows a class-coloured
 * silhouette with the weapon icon. Used in HUD, battle, profile, results, and
 * journal — always shows the player's chosen hero, never a generic placeholder.
 */

import { useState } from "react";

import { ArtImage } from "@/components/ArtImage";
import { WeaponIcon } from "@/components/pixel/WeaponIcon";
import { heroPortraitSlotId, HERO_CLASSES } from "@/data/heroes";
import { weaponTier } from "@/lib/game/heroes";
import type { Hero } from "@/data/heroes";
import type { CharacterArtSlot } from "@/data/artManifest";

interface HeroPortraitProps {
  hero: Hero | null | undefined;
  playerLevel?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const CLASS_COLORS: Record<string, string> = {
  knight: "#c9a84c",
  mage:   "#7b5ea7",
  ranger: "#3fa86a",
};

const SIZE_PX: Record<string, number> = { sm: 40, md: 64, lg: 96 };

export function HeroPortrait({ hero, playerLevel = 1, size = "md", className = "" }: HeroPortraitProps) {
  const px = SIZE_PX[size] ?? 64;
  const [artFailed, setArtFailed] = useState(false);

  if (!hero) {
    // No hero chosen yet — show a neutral silhouette.
    return (
      <div
        className={`hero-portrait-fallback hero-portrait-${size} ${className}`}
        style={{ width: px, height: px, background: "#1c2a4a", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}
        role="img"
        aria-label="No hero selected"
      >
        <span style={{ fontSize: px * 0.55 }} aria-hidden="true">✦</span>
      </div>
    );
  }

  const heroClass = HERO_CLASSES[hero.classId];
  const tier = weaponTier(playerLevel);
  const color = CLASS_COLORS[hero.classId] ?? "#f2b92f";
  const portraitSlot = heroPortraitSlotId(hero) as CharacterArtSlot;

  return (
    <div className={`hero-portrait-wrap hero-portrait-${size} ${className}`} style={{ position: "relative", width: px, height: px }}>
      {!artFailed ? (
        <ArtImage
          slot={portraitSlot}
          className="hero-portrait-img"
          fallback={heroClass.displayName}
          onAssetState={(loaded) => { if (!loaded) setArtFailed(true); }}
        />
      ) : (
        <div
          className="hero-portrait-fallback"
          style={{ width: "100%", height: "100%", background: `radial-gradient(circle, ${color}44 0%, #101a30 75%)`, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <span style={{ fontSize: px * 0.5, color }} aria-hidden="true">✦</span>
        </div>
      )}
      {/* Weapon icon overlay — bottom-right corner */}
      <div
        className="hero-portrait-weapon"
        aria-label={`${heroClass.weapon} tier ${tier}`}
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          background: color,
          borderRadius: 2,
          padding: 2,
          lineHeight: 0,
        }}
      >
        <WeaponIcon weapon={heroClass.weapon} tier={tier} size={Math.max(10, px / 4)} />
      </div>
    </div>
  );
}

/**
 * Compact hero chip for the HUD topbar.
 * Shows a small portrait + hero name + class badge.
 */
export function HeroHudChip({ hero, name, level }: { hero: Hero | null | undefined; name: string; level: number }) {
  if (!hero) return null;
  const heroClass = HERO_CLASSES[hero.classId];
  const tier = weaponTier(level);
  return (
    <span className="hud-hero-chip" aria-label={`${name}, ${heroClass.displayName}`}>
      <WeaponIcon weapon={heroClass.weapon} tier={tier} size={14} />
      <span className="hud-hero-name">{name}</span>
    </span>
  );
}
