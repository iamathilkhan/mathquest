/**
 * lib/game/copy.ts
 * Growth-mindset encouragement copy for elementary/middle school students.
 *
 * Age-appropriate, constructive, never shaming.
 * pick(list, seed) is deterministic so renders and tests stay stable.
 */

export const ACCURACY_COPY = {
  "0-39": [
    "Every mistake is a secret clue that helps your brain grow stronger!",
    "Tough battles make the wisest wizards. Review the steps and try again!",
    "Great effort! Math takes practice — you're closer than you were before.",
    "The journey of a thousand numbers begins with a single step. Keep going!",
  ],
  "40-69": [
    "Solid effort, brave explorer! You're getting the hang of these numbers.",
    "Good progress! A little more practice and you'll master this realm.",
    "Your math power is steadily rising. Keep sharpening your skills!",
    "Well fought! Each round teaches you new strategies for victory.",
  ],
  "70-89": [
    "Impressive math skills, scholar! The realm grows brighter with your knowledge.",
    "Fantastic work! You're demonstrating real mastery of these concepts.",
    "Great calculations! The Guardians are starting to take notice of you.",
    "Splendid arithmetic! Keep this momentum as you push forward.",
  ],
  "90-100": [
    "Legendary calculation! Absolute perfection across the board!",
    "Flawless mastery! You've completely conquered this challenge!",
    "Grand Arithmetician tier! Your precision is an inspiration to all!",
    "Magnificent! The realm celebrates your peerless number sense!",
  ],
} as const;

export const EVENT_COPY = {
  levelUp: [
    "Level up! Your mathematical aura expands across the realms!",
    "A new rank achieved! Your wisdom shines brighter than ever!",
    "Congratulations! You've unlocked greater powers of arithmetic!",
    "Level advanced! Your journey toward Grand Arithmetician continues!",
  ],
  bossDefeated: [
    "The Guardian has fallen! The realm is liberated by your calculations!",
    "Victory! Your exact math dispelled the Guardian's ancient curse!",
    "Triumph! Even the mightiest boss could not withstand your precision!",
    "The Guardian bows to your wisdom. A new realm opens before you!",
  ],
  retreat: [
    "A tactical retreat! Rest, study the scrolls, and return stronger!",
    "Wisdom knows when to regroup. Your progress is saved and waiting!",
    "No battle is wasted — what you learned today will serve you tomorrow!",
    "Step back to leap further! Take a breath and come back ready to conquer.",
  ],
  streak: [
    "Daily streak ablaze! Consistency is the true hallmark of a master!",
    "Another day of training complete! Your dedication is unbeatable!",
    "The flame of knowledge burns bright today! Keep the streak alive!",
    "Day by day, step by step — you're building an unstoppable habit!",
  ],
} as const;

/**
 * Deterministically pick an item from a list based on an integer seed.
 * Never uses Math.random().
 */
export function pick<T>(list: readonly T[], seed: number): T {
  if (list.length === 0) throw new Error("Cannot pick from empty list");
  const index = Math.abs(seed) % list.length;
  return list[index]!;
}

/**
 * Get accuracy bracket key for a percentage (0-100).
 */
export function accuracyBracket(pct: number): keyof typeof ACCURACY_COPY {
  if (pct < 40) return "0-39";
  if (pct < 70) return "40-69";
  if (pct < 90) return "70-89";
  return "90-100";
}
