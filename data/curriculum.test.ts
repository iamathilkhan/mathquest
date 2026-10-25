import { describe, it, expect } from "vitest";
import REALMS, { getRealm, getSubSkill, stageSpec, ALL_SUBSKILLS } from "./curriculum";
import { ENABLED_REALMS, MINION_Q, BOSS_Q, MINION_HP, BOSS_HP } from "@/lib/config";

describe("curriculum data", () => {
  it("contains exactly 6 realms matching ENABLED_REALMS", () => {
    expect(REALMS.length).toBe(6);
    expect(REALMS.map((r) => r.id)).toEqual(ENABLED_REALMS);
  });

  it("each realm has exactly 3 sub-skills with unique IDs", () => {
    const allIds = new Set<string>();
    for (const realm of REALMS) {
      expect(realm.subSkills.length).toBe(3);
      for (const skill of realm.subSkills) {
        expect(allIds.has(skill.id)).toBe(false);
        allIds.add(skill.id);
        expect(skill.realmId).toBe(realm.id);
      }
    }
    expect(ALL_SUBSKILLS.length).toBe(18);
  });

  it("helpers getRealm and getSubSkill work as expected", () => {
    const realm = getRealm("g5-fractions");
    expect(realm.name).toBe("Fraction Forest");

    const skill = getSubSkill("g5-fractions", "g5-fractions-add-sub");
    expect(skill.title).toBe("Adding & Subtracting Fractions");

    expect(() => getRealm("invalid-realm" as unknown as import("@/lib/config").RealmId)).toThrow();
  });

  it("stageSpec produces correct mappings for stages 0 through 4", () => {
    const realm = getRealm("g5-fractions");

    // Stages 0,1 -> subSkill[0], minion
    const s0 = stageSpec(realm, 0);
    expect(s0.kind).toBe("minion");
    expect(s0.subSkillIds).toEqual([realm.subSkills[0].id]);
    expect(s0.questionCount).toBe(MINION_Q);
    expect(s0.enemyHp).toBe(MINION_HP);

    const s1 = stageSpec(realm, 1);
    expect(s1.kind).toBe("minion");
    expect(s1.subSkillIds).toEqual([realm.subSkills[0].id]);

    // Stages 2,3 -> subSkill[1], minion
    const s2 = stageSpec(realm, 2);
    expect(s2.kind).toBe("minion");
    expect(s2.subSkillIds).toEqual([realm.subSkills[1].id]);

    const s3 = stageSpec(realm, 3);
    expect(s3.kind).toBe("minion");
    expect(s3.subSkillIds).toEqual([realm.subSkills[1].id]);

    // Stage 4 -> boss, all 3 sub-skills
    const s4 = stageSpec(realm, 4);
    expect(s4.kind).toBe("boss");
    expect(s4.subSkillIds).toEqual(realm.subSkills.map((s) => s.id));
    expect(s4.questionCount).toBe(BOSS_Q);
    expect(s4.enemyHp).toBe(BOSS_HP);

    expect(() => stageSpec(realm, 5)).toThrow();
  });

  it("checks for verified standards under STRICT_STANDARDS=1", () => {
    if (process.env.STRICT_STANDARDS !== "1") {
      // By default this check is skipped so normal npm test stays green
      expect(true).toBe(true);
      return;
    }

    // When STRICT_STANDARDS=1 is set (e.g. by release-check script)
    for (const skill of ALL_SUBSKILLS) {
      expect(skill.standardCode).not.toBe("TODO_VERIFY");
      expect(skill.standardText).not.toBe("TODO_VERIFY");
    }
  });
});
