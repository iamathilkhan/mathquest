/**
 * lib/game/unlock.ts
 * Realm and stage unlock predicates.
 *
 * Rules:
 *   - Demo mode (player.settings.demoMode) unlocks everything.
 *   - First realm of Grade 5 (g5-fractions) is always unlocked.
 *   - Subsequent realms within the same grade unlock when the previous realm's Guardian is defeated.
 *   - Grade 6 realms are gated by player.level >= GRADE6_UNLOCK_LEVEL.
 *   - Within a realm: stage 0 is open; stage i requires stage i-1 cleared (stars >= 1);
 *     stage 4 (Boss) requires stages 0-3 all cleared.
 */
import type { Player } from "@/lib/schemas";
import { getRealm, type Realm } from "@/data/curriculum";
import { GRADE6_UNLOCK_LEVEL, type RealmId } from "@/lib/config";

export interface UnlockConfig {
  grade6UnlockLevel?: number;
  enabledRealms?: readonly string[];
}

/** Grade 5 realms in canonical progression order */
const G5_ORDER: RealmId[] = ["g5-fractions", "g5-decimals", "g5-volume"];
/** Grade 6 realms in canonical progression order */
const G6_ORDER: RealmId[] = ["g6-ratios", "g6-fracdiv", "g6-area"];

/**
 * Determine if a realm is unlocked for the player.
 */
export function isRealmUnlocked(
  player: Player,
  realm: Realm,
  config?: UnlockConfig
): boolean {
  if (player.settings?.demoMode) return true;

  const minLevel = config?.grade6UnlockLevel ?? GRADE6_UNLOCK_LEVEL;

  // Grade 6 level gating
  if (realm.grade === 6 && player.level < minLevel) {
    return false;
  }

  const order = realm.grade === 5 ? G5_ORDER : G6_ORDER;
  const index = order.indexOf(realm.id as RealmId);

  // If first realm in grade, it's open
  if (index === 0) return true;

  // Otherwise, requires previous realm's Guardian defeated
  const prevRealmId = order[index - 1]!;
  return Boolean(player.realms[prevRealmId]?.bossDefeated);
}

/**
 * Return human-readable reason why a realm is locked, or null if unlocked.
 */
export function lockReason(
  player: Player,
  realm: Realm,
  config?: UnlockConfig
): string | null {
  if (isRealmUnlocked(player, realm, config)) return null;

  const minLevel = config?.grade6UnlockLevel ?? GRADE6_UNLOCK_LEVEL;
  if (realm.grade === 6 && player.level < minLevel) {
    return `Reach Level ${minLevel} to enter Grade 6 realms`;
  }

  const order = realm.grade === 5 ? G5_ORDER : G6_ORDER;
  const index = order.indexOf(realm.id as RealmId);
  if (index > 0) {
    const prevRealmId = order[index - 1]!;
    const prevRealm = getRealm(prevRealmId);
    return `Defeat the ${prevRealm.bossName} first`;
  }

  return "Locked";
}

/**
 * Determine if a specific stage within a realm is unlocked for the player.
 * stageIndex: 0-4 (0-3 minions, 4 boss)
 */
export function isStageUnlocked(
  player: Player,
  realmId: string,
  stageIndex: number,
  config?: UnlockConfig
): boolean {
  if (player.settings?.demoMode) return true;

  const realm = getRealm(realmId as RealmId);
  if (!isRealmUnlocked(player, realm, config)) return false;

  if (stageIndex === 0) return true;

  const progress = player.realms[realmId];
  if (!progress) return false;

  // For boss stage (stageIndex 4): requires stages 0, 1, 2, 3 cleared
  if (stageIndex === 4) {
    return [0, 1, 2, 3].every((idx) => {
      const stars = progress.stars[idx];
      return stars !== undefined && stars >= 1;
    });
  }

  // Minion stage i requires stage i - 1 cleared (stars >= 1)
  const prevStars = progress.stars[stageIndex - 1];
  return prevStars !== undefined && prevStars >= 1;
}
