/**
 * data/curriculum.ts
 * Describes all 6 realms, their 3 sub-skills, and stage layout.
 * standardCode / standardText are placeholders until the official GSE text is pasted.
 */
import type { RealmId } from "@/lib/config";
import { QUESTIONS_PER_TIER_NORMAL, QUESTIONS_PER_TIER_BOSS, MINION_Q, BOSS_Q, MINION_HP, BOSS_HP } from "@/lib/config";

export type Tier = "easy" | "medium" | "hard";

export interface SubSkill {
  id: string;
  realmId: RealmId;
  title: string;
  standardCode: string;
  standardText: string;
}

export interface Realm {
  id: RealmId;
  name: string;
  theme: string;
  grade: 5 | 6;
  bossName: string;
  bossTaunt: string;
  blurb: string;
  subSkills: [SubSkill, SubSkill, SubSkill];
}

export type StageKind = "minion" | "boss";

export interface StageSpec {
  kind: StageKind;
  subSkillIds: string[];
  questionCount: number;
  enemyHp: number;
  perTier: number; // questions per difficulty tier in the pool
}

const REALMS: Realm[] = [
  {
    id: "g5-fractions",
    name: "Fraction Forest",
    theme: "forest",
    grade: 5,
    bossName: "Fraction Warden",
    bossTaunt: "Your fractions are weak, young scholar!",
    blurb: "Navigate a mystical forest where every path requires mastering fractions.",
    subSkills: [
      {
        id: "g5-fractions-add-sub",
        realmId: "g5-fractions",
        title: "Adding & Subtracting Fractions",
        standardCode: "MGSE5.NF.1",
        standardText: "Add and subtract fractions with unlike denominators by using equivalent fractions.",
      },
      {
        id: "g5-fractions-multiply",
        realmId: "g5-fractions",
        title: "Multiplying Fractions",
        standardCode: "MGSE5.NF.4",
        standardText: "Apply and extend multiplication to multiply a fraction or whole number by a fraction.",
      },
      {
        id: "g5-fractions-divide",
        realmId: "g5-fractions",
        title: "Dividing Unit Fractions",
        standardCode: "MGSE5.NF.7",
        standardText: "Interpret and compute division of unit fractions by whole numbers and whole numbers by unit fractions.",
      },
    ],
  },
  {
    id: "g5-decimals",
    name: "Decimal Dunes",
    theme: "dunes",
    grade: 5,
    bossName: "Decimal Djinn",
    bossTaunt: "Can you survive the shifting sands of decimal operations?",
    blurb: "Cross the endless dunes by mastering decimal place value and operations.",
    subSkills: [
      {
        id: "g5-decimals-place-value",
        realmId: "g5-decimals",
        title: "Decimal Place Value",
        standardCode: "MGSE5.NBT.1-3",
        standardText: "Recognize place value patterns and read, write, and compare decimals to thousandths.",
      },
      {
        id: "g5-decimals-ops",
        realmId: "g5-decimals",
        title: "Multiplying & Dividing Decimals",
        standardCode: "MGSE5.NBT.7",
        standardText: "Add, subtract, multiply, and divide decimals to hundredths using place-value strategies.",
      },
      {
        id: "g5-decimals-powers",
        realmId: "g5-decimals",
        title: "Powers of Ten",
        standardCode: "MGSE5.NBT.2",
        standardText: "Explain patterns in the number of zeros when multiplying or dividing by powers of ten.",
      },
    ],
  },
  {
    id: "g5-volume",
    name: "Volume Volcano",
    theme: "volcano",
    grade: 5,
    bossName: "Magma Golem",
    bossTaunt: "Let's see if you can measure the power of the volcano!",
    blurb: "Survive the erupting volcano by calculating volumes and understanding 3-D shapes.",
    subSkills: [
      {
        id: "g5-volume-unit",
        realmId: "g5-volume",
        title: "Understanding Volume",
        standardCode: "MGSE5.MD.3",
        standardText: "Recognize volume as an attribute of solid figures and understand unit-cube measurement.",
      },
      {
        id: "g5-volume-formula",
        realmId: "g5-volume",
        title: "Volume Formula (V = l × w × h)",
        standardCode: "MGSE5.MD.5",
        standardText: "Relate volume to multiplication and solve real-world volume problems.",
      },
      {
        id: "g5-volume-compose",
        realmId: "g5-volume",
        title: "Composite Volumes",
        standardCode: "MGSE5.MD.5",
        standardText: "Apply volume formulas to solve problems involving composite solid figures.",
      },
    ],
  },
  {
    id: "g6-ratios",
    name: "Ratio Reef",
    theme: "reef",
    grade: 6,
    bossName: "Ratio Kraken",
    bossTaunt: "My tentacles stretch in every ratio — can you match them?",
    blurb: "Dive into the reef and discover proportional relationships hidden beneath the waves.",
    subSkills: [
      {
        id: "g6-ratios-concept",
        realmId: "g6-ratios",
        title: "Ratio Concepts & Notation",
        standardCode: "MGSE6.RP.1-2",
        standardText: "Understand ratios and unit rates as comparisons of two quantities.",
      },
      {
        id: "g6-ratios-unit-rate",
        realmId: "g6-ratios",
        title: "Unit Rates & Proportions",
        standardCode: "MGSE6.RP.3",
        standardText: "Use ratio and rate reasoning to solve mathematical and real-world problems.",
      },
      {
        id: "g6-ratios-percent",
        realmId: "g6-ratios",
        title: "Percentages",
        standardCode: "MGSE6.RP.3C",
        standardText: "Find a percent of a quantity and solve problems involving the whole, part, or percent.",
      },
    ],
  },
  {
    id: "g6-fracdiv",
    name: "Quotient Quarry",
    theme: "quarry",
    grade: 6,
    bossName: "Quotient Colossus",
    bossTaunt: "Only those who divide fractions precisely may pass!",
    blurb: "Excavate the quarry by dividing fractions and understanding quotients.",
    subSkills: [
      {
        id: "g6-fracdiv-meaning",
        realmId: "g6-fracdiv",
        title: "Meaning of Division with Fractions",
        standardCode: "MGSE6.NS.1",
        standardText: "Interpret and compute quotients of fractions and solve word problems involving fraction division.",
      },
      {
        id: "g6-fracdiv-compute",
        realmId: "g6-fracdiv",
        title: "Dividing Fractions by Fractions",
        standardCode: "MGSE6.NS.1",
        standardText: "Compute quotients of fractions using the relationship between multiplication and division.",
      },
      {
        id: "g6-fracdiv-word",
        realmId: "g6-fracdiv",
        title: "Fraction Division Word Problems",
        standardCode: "MGSE6.NS.1",
        standardText: "Solve real-world problems involving division of fractions by fractions.",
      },
    ],
  },
  {
    id: "g6-area",
    name: "Area Atoll",
    theme: "atoll",
    grade: 6,
    bossName: "Area Sentinel",
    bossTaunt: "The atoll is guarded by the power of area — prove yourself!",
    blurb: "Map the atoll by calculating areas of triangles, quadrilaterals, and composite shapes.",
    subSkills: [
      {
        id: "g6-area-polygons",
        realmId: "g6-area",
        title: "Area of Triangles & Quadrilaterals",
        standardCode: "MGSE6.G.1",
        standardText: "Find areas of triangles, special quadrilaterals, and polygons by composing or decomposing shapes.",
      },
      {
        id: "g6-area-composite",
        realmId: "g6-area",
        title: "Area of Composite Shapes",
        standardCode: "MGSE6.G.1",
        standardText: "Use composition and decomposition to find the area of composite polygons.",
      },
      {
        id: "g6-area-surface",
        realmId: "g6-area",
        title: "Surface Area & Nets",
        standardCode: "MGSE6.G.4",
        standardText: "Represent three-dimensional figures with nets and use nets to find surface area.",
      },
    ],
  },
];

// ─── helpers ────────────────────────────────────────────────────────────────

export function getRealm(id: RealmId): Realm {
  const r = REALMS.find((r) => r.id === id);
  if (!r) throw new Error(`Unknown realm: ${id}`);
  return r;
}

export function getSubSkill(realmId: RealmId, subId: string): SubSkill {
  const realm = getRealm(realmId);
  const s = realm.subSkills.find((s) => s.id === subId);
  if (!s) throw new Error(`Unknown sub-skill ${subId} in realm ${realmId}`);
  return s;
}

/**
 * stageSpec: stages 0-4 per realm.
 * Stages 0,1 → sub-skill 0; stages 2,3 → sub-skill 1; stage 4 → boss (all 3 sub-skills).
 * Sub-skill indices are 0-based per the preamble: "stages 1-4 are minion battles (sub-skills 1,1,2,2)".
 * Note: zero-indexed → stages 0-1 use subSkill[0], stages 2-3 use subSkill[1].
 */
export function stageSpec(realm: Realm, stageIndex: number): StageSpec {
  if (stageIndex < 0 || stageIndex > 4) {
    throw new Error(`stageIndex must be 0-4, got ${stageIndex}`);
  }
  if (stageIndex === 4) {
    // Boss stage — all 3 sub-skills
    return {
      kind: "boss",
      subSkillIds: realm.subSkills.map((s) => s.id),
      questionCount: BOSS_Q,
      enemyHp: BOSS_HP,
      perTier: QUESTIONS_PER_TIER_BOSS,
    };
  }
  // Minion stages: 0,1 → subSkill[0]; 2,3 → subSkill[1]
  const subSkillIndex = stageIndex < 2 ? 0 : 1;
  return {
    kind: "minion",
    subSkillIds: [realm.subSkills[subSkillIndex].id],
    questionCount: MINION_Q,
    enemyHp: MINION_HP,
    perTier: QUESTIONS_PER_TIER_NORMAL,
  };
}

export const ALL_SUBSKILLS: SubSkill[] = REALMS.flatMap((r) =>
  r.subSkills.map((s) => ({ ...s, realmId: r.id }))
);

/** Returns only realms whose IDs are in the config ENABLED_REALMS list */
export function enabledRealms(config: { enabledRealms: readonly string[] }): Realm[] {
  return REALMS.filter((r) => config.enabledRealms.includes(r.id));
}

export default REALMS;
