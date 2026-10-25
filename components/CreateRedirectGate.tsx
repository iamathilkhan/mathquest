"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useGameStore } from "@/store/gameStore";
import { shouldRedirectToCreate } from "@/lib/game/createGate";

/**
 * CreateRedirectGate: Redirects v1 players without a hero to /create once per session.
 *
 * Wraps page content. After hydration, checks if:
 * - Player has a save (not new)
 * - Player has no hero chosen
 * - Haven't redirected once already this session
 *
 * If all true, redirects to /create and marks redirectedToCreateOnce.
 */
export function CreateRedirectGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useGameStore((state) => state.hydrated);
  const player = useGameStore((state) => state.player);
  const saveExists = useGameStore((state) => state.saveExists);
  const redirectedOnce = useGameStore((state) => state.redirectedToCreateOnce);
  const markRedirected = useGameStore((state) => state.markRedirectedToCreate);

  useEffect(() => {
    if (!hydrated) return;

    const shouldRedirect = shouldRedirectToCreate(player, saveExists, redirectedOnce);
    if (shouldRedirect) {
      markRedirected();
      router.push("/create");
    }
  }, [hydrated, player, saveExists, redirectedOnce, markRedirected, router]);

  if (!hydrated) {
    return null;
  }

  return <>{children}</>;
}
