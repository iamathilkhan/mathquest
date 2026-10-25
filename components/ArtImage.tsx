"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { artFor, type ArtSlot } from "@/data/artManifest";

export function ArtImage({ slot, className = "", fallback, onAssetState }: { slot: ArtSlot; className?: string; fallback?: string; onAssetState?: (loaded: boolean) => void }) {
  const [failed, setFailed] = useState(false);
  const art = artFor(slot);
  const debug = typeof window !== "undefined" && (new URLSearchParams(window.location.search).get("debug") === "art" || process.env.NODE_ENV === "development");

  useEffect(() => {
    if (debug && failed) {
      console.warn(`[ArtImage DEBUG] Slot failed to load: ${slot} from ${art.path}`);
    }
  }, [debug, failed, slot, art.path]);

  if (failed) {
    if (debug) {
      return <div className={`art-slot-fallback ${className}`} style={{ border: "2px solid red", outline: "1px dashed red" }} role="img" aria-label={`${art.fallbackLabel} (DEBUG: failed to load ${art.path})`}><span aria-hidden="true">✦</span><small>{fallback ?? art.fallbackLabel}</small></div>;
    }
    return <div className={`art-slot-fallback ${className}`} role="img" aria-label={art.fallbackLabel}><span aria-hidden="true">✦</span><small>{fallback ?? art.fallbackLabel}</small></div>;
  }
  return <Image className={className} src={art.path} alt={art.alt} width={480} height={320} unoptimized onLoad={() => onAssetState?.(true)} onError={() => { onAssetState?.(false); setFailed(true); console.warn(`[ArtImage] Failed to load ${slot} from ${art.path}`); }} />;
}
