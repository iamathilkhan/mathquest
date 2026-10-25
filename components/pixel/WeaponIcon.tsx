/**
 * components/pixel/WeaponIcon.tsx
 *
 * Code-drawn pixel weapon icons in three tier colour palettes.
 * No assets. CSS-only; respects reduced-motion for animated variants.
 * Pure presentational: no state, no I/O.
 */

type Weapon = "sword" | "staff" | "bow";
type Tier = 1 | 2 | 3;

/** Tier colour palette: [blade/tip, grip/shaft, accent] */
const TIER_PALETTES: Record<Tier, [string, string, string]> = {
  1: ["#c9b27c", "#6b4c2a", "#e9d9ae"],
  2: ["#a0a0b8", "#3a3a5c", "#d8d8f8"],
  3: ["#e8d060", "#4a2a6a", "#fffacc"],
};

interface WeaponIconProps {
  weapon: Weapon;
  tier?: Tier;
  size?: number;
  className?: string;
}

export function WeaponIcon({ weapon, tier = 1, size = 24, className = "" }: WeaponIconProps) {
  const [blade, grip, accent] = TIER_PALETTES[tier];

  if (weapon === "sword") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        role="img"
        aria-label={`Sword tier ${tier}`}
        className={className}
        shapeRendering="crispEdges"
      >
        {/* Blade */}
        <rect x="11" y="2" width="2" height="14" fill={blade} />
        {/* Crossguard */}
        <rect x="6" y="14" width="12" height="2" fill={grip} />
        {/* Grip */}
        <rect x="11" y="16" width="2" height="5" fill={grip} />
        {/* Pommel */}
        <rect x="10" y="21" width="4" height="1" fill={grip} />
        {/* Blade accent */}
        <rect x="12" y="3" width="1" height="10" fill={accent} opacity="0.6" />
        {/* Tip */}
        <rect x="11" y="2" width="2" height="2" fill={accent} />
      </svg>
    );
  }

  if (weapon === "staff") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        role="img"
        aria-label={`Staff tier ${tier}`}
        className={className}
        shapeRendering="crispEdges"
      >
        {/* Shaft */}
        <rect x="11" y="4" width="2" height="18" fill={grip} />
        {/* Crystal orb top */}
        <rect x="9" y="2" width="6" height="4" fill={blade} />
        <rect x="8" y="3" width="8" height="2" fill={blade} />
        {/* Orb glow */}
        <rect x="10" y="2" width="2" height="2" fill={accent} opacity="0.8" />
        {/* Rune band */}
        <rect x="10" y="12" width="4" height="2" fill={accent} opacity="0.5" />
      </svg>
    );
  }

  // bow
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={`Bow tier ${tier}`}
      className={className}
      shapeRendering="crispEdges"
    >
      {/* Bow limbs (curved via rects) */}
      <rect x="7" y="2"  width="2" height="4"  fill={blade} />
      <rect x="6" y="5"  width="2" height="4"  fill={blade} />
      <rect x="5" y="8"  width="2" height="4"  fill={blade} />
      <rect x="6" y="12" width="2" height="4"  fill={blade} />
      <rect x="7" y="15" width="2" height="4"  fill={blade} />
      {/* Handle */}
      <rect x="9" y="9"  width="2" height="6"  fill={grip} />
      {/* Bowstring */}
      <rect x="8" y="3"  width="1" height="18" fill={accent} opacity="0.7" />
      {/* Nock arrow */}
      <rect x="13" y="11" width="6" height="1" fill={accent} />
      <rect x="18" y="10" width="2" height="3" fill={accent} opacity="0.6" />
    </svg>
  );
}

/** Inline weapon glyph for tight spaces (HUD, chips). */
export function WeaponGlyph({ weapon }: { weapon: Weapon }) {
  if (weapon === "sword") return <span aria-label="sword" role="img">⚔</span>;
  if (weapon === "staff") return <span aria-label="staff" role="img">🪄</span>;
  return <span aria-label="bow" role="img">🏹</span>;
}
