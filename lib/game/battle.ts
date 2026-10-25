/**
 * lib/game/battle.ts
 * Pure battle reducer. The single source of truth for battle state.
 *
 * IMPORTANT: This reducer MUST be pure:
 *   - No Date.now(), no Math.random(), no network, no mutations.
 *   - React StrictMode calls reducers twice with the same inputs;
 *     mutation causes double-fire effects. We deep-copy all arrays/objects.
 *   - The fifty-power uses a deterministic hash of question id instead of random.
 */
import type { Pools, VerifiedQuestion, AnswerRecord, Tier } from "@/lib/schemas";
import { evaluate, type Verdict } from "./evaluate";
import {
  nextAdaptive,
  floorForBoss,
  takeQuestion,
  initialAdaptive,
  type AdaptiveState,
} from "./adaptive";
import { xpForAnswer, damageFor } from "./xp";
import { MINION_Q, BOSS_Q, MINION_HP, BOSS_HP, COMBO_REWARDS } from "@/lib/config";
import type { ClassId } from "@/data/heroes";
import { HERO_CLASSES } from "@/data/heroes";
import { favouredMultiplier, xpMultiplier } from "./heroes";

// ─── State ────────────────────────────────────────────────────────────────────────

export type BattlePhase = "question" | "feedback" | "won" | "lost";
export type EndReason =
  | "enemy_defeated"
  | "out_of_hearts"
  | "out_of_questions"
  | "pool_exhausted";
export type BattleMode = "minion" | "boss";
export type PowerItem = "hint" | "shield" | "fifty";

export interface Loadout {
  hint: number;
  shield: number;
  fifty: number;
}

export interface BattleState {
  pools: Pools;
  mode: BattleMode;
  hearts: number;
  maxHearts: number;
  enemyHp: number;
  enemyMax: number;
  qIndex: number;
  total: number;
  adaptive: AdaptiveState;
  combo: number;
  bestCombo: number;
  currentQuestion: VerifiedQuestion | null;
  phase: BattlePhase;
  endReason: EndReason | null;
  correctCount: number;
  wrongCount: number;
  xp: number;
  history: AnswerRecord[];
  verdict: Verdict | null;
  loadout: Loadout;
  used: Loadout;
  shieldActive: boolean;
  hintShown: boolean;
  /** Option indices hidden by fifty-fifty power (max 2, always wrong options) */
  hidden: number[];
  /** True if the most recent ANSWER crossed a boss HP phase boundary */
  phaseJustChanged: boolean;
  hardCorrect: number;
  hero?: { classId: ClassId };
  realmId?: string;
  specialCharge: number;
  specialUsesLeft: number;
  specialArmed: boolean;
  passiveSpent: boolean;
  heroFx: string[];
}

// ─── Actions ─────────────────────────────────────────────────────────────────────

export type BattleAction =
  | {
      type: "INIT";
      pools: Pools;
      mode: BattleMode;
      startTier: Tier;
      loadout: Loadout;
      hearts: number;
      hero?: { classId: ClassId };
      realmId?: string;
    }
  | { type: "ANSWER"; picked: number }
  | { type: "NEXT" }
  | { type: "POWER"; item: PowerItem }
  | { type: "SPECIAL" };

// ─── Reducer ─────────────────────────────────────────────────────────────────────

const EMPTY_LOADOUT: Loadout = { hint: 0, shield: 0, fifty: 0 };

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case "INIT": {
      const mode = action.mode;
      const total = mode === "boss" ? BOSS_Q : MINION_Q;
      const enemyMax = mode === "boss" ? BOSS_HP : MINION_HP;
      const adaptive = initialAdaptive(action.startTier);
      const takeResult = takeQuestion(action.pools, action.startTier);
      const loadout = { ...action.loadout };
      if (action.hero?.classId === "mage") {
        loadout.hint += 1;
      }
      if (!takeResult) {
        return {
          ...emptyState(),
          phase: "lost",
          endReason: "pool_exhausted",
          total,
          enemyMax,
          enemyHp: enemyMax,
          hearts: action.hearts,
          maxHearts: action.hearts,
          loadout,
          used: { ...EMPTY_LOADOUT },
          mode,
          pools: action.pools,
          adaptive,
          hero: action.hero,
          realmId: action.realmId,
        };
      }
      return {
        ...emptyState(),
        pools: takeResult.pools,
        mode,
        hearts: action.hearts,
        maxHearts: action.hearts,
        enemyHp: enemyMax,
        enemyMax,
        qIndex: 0,
        total,
        adaptive,
        currentQuestion: takeResult.q,
        phase: "question",
        loadout,
        used: { ...EMPTY_LOADOUT },
        hero: action.hero,
        realmId: action.realmId,
        specialCharge: 0,
        specialUsesLeft: 2,
        specialArmed: false,
        passiveSpent: false,
        heroFx: [],
      };
    }

    case "ANSWER": {
      if (state.phase !== "question") return state;
      if (!state.currentQuestion) return state;
      const { picked } = action;
      if (picked < 0 || picked > 3) return state;
      if (state.hidden.includes(picked)) return state;

      const verdict = evaluate(state.currentQuestion, picked);
      let combo = state.combo;
      let bestCombo = state.bestCombo;
      let hearts = state.hearts;
      let enemyHp = state.enemyHp;
      let correctCount = state.correctCount;
      let wrongCount = state.wrongCount;
      let xp = state.xp;
      let shieldActive = state.shieldActive;
      let hardCorrect = state.hardCorrect;
      let loadout = { ...state.loadout };
      let specialCharge = state.specialCharge;
      let specialArmed = state.specialArmed;
      let passiveSpent = state.passiveSpent;
      const heroFx: string[] = [];

      // Boss phase before this answer
      const phaseBefore = bossPhaseOf(state.enemyHp, state.enemyMax);

      if (verdict.correct) {
        combo += 1;
        bestCombo = Math.max(bestCombo, combo);
        specialCharge += 1;

        const baseDmg = damageFor(state.currentQuestion.tier, combo);
        const mult =
          state.hero && state.realmId
            ? favouredMultiplier(state.hero.classId, state.realmId)
            : 1;
        const isFavoured = mult > 1;

        let totalDmg = baseDmg;
        if (specialArmed) {
          totalDmg = baseDmg * 2;
          specialArmed = false;
          heroFx.push("POWER STRIKE ×2");
        }
        if (isFavoured) {
          totalDmg = Math.round(totalDmg * mult);
          heroFx.push("FAVOURED FOE +50% DAMAGE");
        }

        enemyHp = Math.max(0, enemyHp - totalDmg);

        let earnedXp = xpForAnswer(state.currentQuestion.tier, combo);
        if (state.hero && state.hero.classId === "ranger") {
          earnedXp = Math.round(earnedXp * xpMultiplier(state.hero.classId));
        }
        xp += earnedXp;

        correctCount += 1;
        if (state.currentQuestion.tier === "hard") hardCorrect += 1;
      } else {
        combo = 0;
        specialCharge = 0;
        wrongCount += 1;

        if (state.hero?.classId === "knight" && !passiveSpent) {
          passiveSpent = true;
          heroFx.push("STALWART: heart saved");
        } else if (shieldActive) {
          // Shield absorbs one wrong answer
          shieldActive = false;
        } else {
          hearts = Math.max(0, hearts - 1);
        }
      }

      // Combo rewards (grant at exact thresholds)
      const comboRewardTier = COMBO_REWARDS[combo as keyof typeof COMBO_REWARDS];
      if (comboRewardTier) {
        if (comboRewardTier === "hint") loadout = { ...loadout, hint: loadout.hint + 1 };
        if (comboRewardTier === "shield") loadout = { ...loadout, shield: loadout.shield + 1 };
      }

      // Adaptive update
      const floor =
        state.mode === "boss" ? floorForBoss(enemyHp / state.enemyMax) : "easy";
      const adaptive = nextAdaptive(state.adaptive, verdict.correct, floor);

      // Boss phase after this answer
      const phaseAfter = bossPhaseOf(enemyHp, state.enemyMax);
      const phaseJustChanged = state.mode === "boss" && phaseBefore !== phaseAfter;

      const record: AnswerRecord = {
        id: state.currentQuestion.id,
        tier: state.currentQuestion.tier,
        correct: verdict.correct,
        subSkillId: state.currentQuestion.subSkillId,
      };

      return {
        ...state,
        combo,
        bestCombo,
        hearts,
        enemyHp,
        correctCount,
        wrongCount,
        xp,
        shieldActive,
        hardCorrect,
        loadout,
        verdict,
        adaptive,
        phaseJustChanged,
        history: [...state.history, record],
        phase: "feedback",
        specialCharge,
        specialArmed,
        passiveSpent,
        heroFx,
      };
    }

    case "NEXT": {
      if (state.phase !== "feedback") return state;

      if (state.enemyHp === 0) {
        return { ...state, phase: "won", endReason: "enemy_defeated", heroFx: [] };
      }
      if (state.hearts <= 0) {
        return { ...state, phase: "lost", endReason: "out_of_hearts", heroFx: [] };
      }
      if (state.qIndex + 1 >= state.total) {
        return { ...state, phase: "lost", endReason: "out_of_questions", heroFx: [] };
      }

      const takeResult = takeQuestion(state.pools, state.adaptive.tier);
      if (!takeResult) {
        return { ...state, phase: "lost", endReason: "pool_exhausted", heroFx: [] };
      }

      return {
        ...state,
        pools: takeResult.pools,
        qIndex: state.qIndex + 1,
        currentQuestion: takeResult.q,
        phase: "question",
        verdict: null,
        hintShown: false,
        hidden: [],
        phaseJustChanged: false,
        heroFx: [],
      };
    }

    case "POWER": {
      if (state.phase !== "question") return state;
      if (!state.currentQuestion) return state;

      switch (action.item) {
        case "hint": {
          if (state.loadout.hint <= 0 || state.hintShown) return state;
          return {
            ...state,
            hintShown: true,
            loadout: { ...state.loadout, hint: state.loadout.hint - 1 },
            used: { ...state.used, hint: state.used.hint + 1 },
          };
        }
        case "shield": {
          if (state.loadout.shield <= 0 || state.shieldActive) return state;
          return {
            ...state,
            shieldActive: true,
            loadout: { ...state.loadout, shield: state.loadout.shield - 1 },
            used: { ...state.used, shield: state.used.shield + 1 },
          };
        }
        case "fifty": {
          if (state.loadout.fifty <= 0 || state.hidden.length > 0) return state;
          const hidden = pickFiftyFiftyHidden(
            state.currentQuestion,
            state.currentQuestion.correctIndex
          );
          return {
            ...state,
            hidden,
            loadout: { ...state.loadout, fifty: state.loadout.fifty - 1 },
            used: { ...state.used, fifty: state.used.fifty + 1 },
          };
        }
        default:
          return state;
      }
    }

    case "SPECIAL": {
      if (state.phase !== "question") return state;
      if (!state.currentQuestion) return state;
      if (!state.hero) return state;
      if (state.specialUsesLeft <= 0) return state;
      const heroClass = HERO_CLASSES[state.hero.classId];
      if (!heroClass) return state;
      if (state.specialCharge < heroClass.special.chargeNeeded) return state;

      if (state.hero.classId === "knight") {
        return {
          ...state,
          specialArmed: true,
          specialCharge: 0,
          specialUsesLeft: state.specialUsesLeft - 1,
        };
      }

      if (state.hero.classId === "mage") {
        if (state.hidden.length > 0) return state;
        const hidden = pickFiftyFiftyHidden(
          state.currentQuestion,
          state.currentQuestion.correctIndex
        );
        return {
          ...state,
          hidden,
          specialCharge: 0,
          specialUsesLeft: state.specialUsesLeft - 1,
        };
      }

      if (state.hero.classId === "ranger") {
        return {
          ...state,
          hearts: Math.min(state.maxHearts, state.hearts + 1),
          specialCharge: 0,
          specialUsesLeft: state.specialUsesLeft - 1,
        };
      }

      return state;
    }

    default:
      return state;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────

/**
 * Returns boss phase number (1, 2, or 3) based on HP percentage.
 * Matches floorForBoss thresholds:
 *   Phase 1: hpPct > 0.66
 *   Phase 2: 0.33 < hpPct <= 0.66
 *   Phase 3: hpPct <= 0.33
 */
function bossPhaseOf(hp: number, maxHp: number): 1 | 2 | 3 {
  if (maxHp === 0) return 3;
  const pct = hp / maxHp;
  if (pct > 0.66) return 1;
  if (pct > 0.33) return 2;
  return 3;
}

/**
 * Deterministically pick 2 wrong option indices to hide for fifty-fifty.
 * Uses a hash of the question id to avoid any Math.random().
 * Always picks WRONG options (never the correct index).
 */
function pickFiftyFiftyHidden(q: VerifiedQuestion, correctIndex: number): number[] {
  const wrongIndices = [0, 1, 2, 3].filter((i) => i !== correctIndex);
  const seed = djb2Hash(q.id);
  const arr = [...wrongIndices];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = hashStep(seed, i) % (i + 1);
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr.slice(0, 2).sort((a, b) => a - b);
}

function djb2Hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function hashStep(seed: number, i: number): number {
  return (seed * 1664525 + i * 1013904223) >>> 0;
}

function emptyState(): BattleState {
  return {
    pools: { easy: [], medium: [], hard: [] },
    mode: "minion",
    hearts: 3,
    maxHearts: 3,
    enemyHp: MINION_HP,
    enemyMax: MINION_HP,
    qIndex: 0,
    total: MINION_Q,
    adaptive: initialAdaptive("easy"),
    combo: 0,
    bestCombo: 0,
    currentQuestion: null,
    phase: "question",
    endReason: null,
    correctCount: 0,
    wrongCount: 0,
    xp: 0,
    history: [],
    verdict: null,
    loadout: { ...EMPTY_LOADOUT },
    used: { ...EMPTY_LOADOUT },
    shieldActive: false,
    hintShown: false,
    hidden: [],
    phaseJustChanged: false,
    hardCorrect: 0,
    specialCharge: 0,
    specialUsesLeft: 2,
    specialArmed: false,
    passiveSpent: false,
    heroFx: [],
  };
}
