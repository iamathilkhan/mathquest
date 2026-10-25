"use client";

import Image from "next/image";
import { useState } from "react";

import { artFor, type ArtSlot } from "@/data/artManifest";

export function ArtImage({ slot, className = "", fallback, onAssetState }: { slot: ArtSlot; className?: string; fallback?: string; onAssetState?: (loaded: boolean) => void }) {
  const [failed, setFailed] = useState(false);
  const art = artFor(slot);
  if (failed) {
    return <div className={`art-slot-fallback ${className}`} role="img" aria-label={art.fallbackLabel}><span aria-hidden="true">✦</span><small>{fallback ?? art.fallbackLabel}</small></div>;
  }
  return <Image className={className} src={art.path} alt={art.alt} width={480} height={320} unoptimized onLoad={() => onAssetState?.(true)} onError={() => { onAssetState?.(false); setFailed(true); }} />;
}
