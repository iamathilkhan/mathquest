"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { default as REALMS, getRealm, stageSpec } from "@/data/curriculum";
import { HERO_CLASSES } from "@/data/heroes";
import { ENABLED_REALMS, FEATURES, heartsFor } from "@/lib/config";
import { weakestSubSkill, masteryPct } from "@/lib/game/skill";
import { isStageUnlocked } from "@/lib/game/unlock";
import { levelFromXp, starsFor, titleForLevel, coinsFor } from "@/lib/game/xp";
import { damageFor, xpForAnswer } from "@/lib/game/xp";
import { accuracyBracket, ACCURACY_COPY, pick } from "@/lib/game/copy";
import { BADGES } from "@/lib/game/badges";
import { useBattle } from "@/hooks/useBattle";
import { useHydrated } from "@/hooks/useHydrated";
import { useKeyboardAnswers } from "@/hooks/useKeyboardAnswers";
import { useQuestions } from "@/hooks/useQuestions";
import { useGameStore } from "@/store/gameStore";
import { useSfx } from "@/hooks/useSfx";
import { WorldMapView } from "@/components/WorldMapView";
import { HeroPortrait, HeroHudChip } from "@/components/HeroPortrait";
import { WeaponIcon } from "@/components/pixel/WeaponIcon";
import { heroDisplayName, weaponTier, weaponName, favouredMultiplier } from "@/lib/game/heroes";
import type { Player, Pools, VerifiedQuestion } from "@/lib/schemas";
import type { BattleMode } from "@/lib/game/battle";

export type Screen = "home" | "grade" | "map" | "realm" | "battle" | "profile" | "journal" | "settings";

function PlayerHud({ player }: { player: Player }) {
  const level = levelFromXp(player.xp ?? 0);
  const hearts = heartsFor(player.level);
  const displayName = heroDisplayName(player.profile?.name, player.hero ?? null);
  return (
    <div className="hud panel" aria-label="Player status">
      <span className="hud-level">LV {player.level}</span>
      <span className="hud-xp"><span>XP</span><i><b style={{ width: `${Math.round((level.intoLevel / level.needed) * 100)}%` }} /></i></span>
      <HeroHudChip hero={player.hero} name={displayName} level={player.level} />
      <span aria-label={`${hearts} maximum hearts`}>♥ {hearts}</span>
      <span>◈ {player.coins}</span>
      <Link className="icon-link" href="/settings" aria-label="Settings">⚙</Link>
    </div>
  );
}

function BottomNav({ active }: { active: "map" | "journal" | "profile" | "settings" }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <Link aria-current={active === "map" ? "page" : undefined} href="/map"><span>⌂</span>Home</Link>
      <Link aria-current={active === "journal" ? "page" : undefined} href="/journal"><span>▤</span>Quests</Link>
      <Link aria-current={active === "profile" ? "page" : undefined} href="/profile"><span>☆</span>Profile</Link>
    </nav>
  );
}

function Frame({ children, player, nav }: { children: React.ReactNode; player: Player; nav?: "map" | "journal" | "profile" | "settings" }) {
  return (
    <main className="app-frame">
      <header className="topbar"><Link href="/map" className="wordmark">MATH<span>QUEST</span></Link><PlayerHud player={player} /></header>
      {children}
      {nav && <BottomNav active={nav} />}
    </main>
  );
}

function useSave() {
  const hydrated = useHydrated();
  const player = useGameStore((state) => state.player);
  const hasSave = useGameStore((state) => state.saveExists);
  return { hydrated, player, hasSave };
}

export function MathQuestScreen({ screen, realmId, stageIndex }: { screen: Screen; realmId?: string; stageIndex?: number }) {
  const router = useRouter();
  const { hydrated, player, hasSave } = useSave();
  const startNewGame = useGameStore((state) => state.startNewGame);
  const setGrade = useGameStore((state) => state.setGrade);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const resetAll = useGameStore((state) => state.resetAll);
  const sfx = useSfx();
  const [showHow, setShowHow] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [about, setAbout] = useState(false);

  const startStage = (selectedRealmId: string, selectedStageIndex: number) => {
    const selectedRealm = getRealm(selectedRealmId as (typeof ENABLED_REALMS)[number]);
    const selectedSpec = stageSpec(selectedRealm, selectedStageIndex);
    const firstLesson = selectedSpec.subSkillIds.find(
      (subSkillId) => !(player.lessonsFinished ?? []).includes(subSkillId)
    );
    if (firstLesson) {
      router.push(`/realm/${selectedRealmId}/learn/${firstLesson}`);
      return;
    }
    router.push(`/battle/${selectedRealmId}/${selectedStageIndex}`);
  };

  if (!hydrated) return <main className="loading-screen" aria-live="polite">Opening your quest...</main>;

  if (screen === "home") {
    return (
      <main className="landing scene-landing">
        <Link className="settings-corner" href="/settings" aria-label="Settings">⚙</Link>
        <div className="landing-copy">
          <p className="eyebrow">A math adventure for curious minds</p>
          <h1 className="logo-title">MATHQUEST</h1>
          <p className="tagline">Your Quest. Your Knowledge.<br />Your World.</p>
          <div className="landing-actions">
            <button className="button button-primary" onClick={() => { sfx("click"); if (hasSave) setConfirmReset(true); else router.push("/create"); }}>Start quest <span>↗</span></button>
            {hasSave && <button className="button button-secondary" onClick={() => router.push("/map")}>Continue as {heroDisplayName(player.profile?.name, player.hero ?? null)}</button>}
            <button className="button button-quiet" onClick={() => setShowHow(true)}>How to play</button>
          </div>
        </div>
        <div className="landing-landscape" aria-hidden="true"><span className="moon" /><span className="ridge ridge-back" /><span className="ridge ridge-front" /><span className="landing-gate">✦</span></div>
        {(confirmReset || showHow) && <div className="scrim" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && (setConfirmReset(false), setShowHow(false))}>
          <section className="dialog panel" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            {confirmReset ? <>
              <p className="eyebrow">A new beginning</p><h2 id="dialog-title">Start over?</h2><p>Saved progress will be erased.</p>
              <div className="button-row"><button className="button button-quiet" onClick={() => setConfirmReset(false)}>Keep save</button><button className="button button-primary" onClick={() => { startNewGame(""); setConfirmReset(false); router.push("/create"); }}>Start over</button></div>
            </> : <>
              <p className="eyebrow">How to play</p><h2 id="dialog-title">Ready for the realms?</h2><ol className="how-list"><li>Answer questions to damage enemies.</li><li>Protect your hearts and use power-ups.</li><li>Earn XP, coins, and stars.</li><li>Defeat each realm&apos;s Guardian to unlock the next.</li></ol><button className="button button-primary full" onClick={() => setShowHow(false)}>Got it</button>
            </>}
          </section>
        </div>}
      </main>
    );
  }

  if (screen === "grade") {
    const topicGroups = [5, 6].map((grade) => ({ grade, realms: REALMS.filter((realm) => realm.grade === grade) }));
    return <Frame player={player}>
      <section className="content-wrap grade-page">
        <p className="eyebrow">Choose your quest</p><h1>Pick your grade</h1><p className="lede">Your worlds and progress stay saved when you switch quests.</p>
        <div className="grade-grid">{topicGroups.map(({ grade, realms }) => <article className={`grade-card grade-${grade}`} key={grade}>
          <div className="grade-art" aria-hidden="true"><span>{grade === 5 ? "Ⅴ" : "Ⅵ"}</span><i /></div>
          <div className="grade-card-copy"><p className="eyebrow">MathQuest · {grade}</p><h2>Grade {grade}</h2><p>{realms.map((realm) => realm.name.replace(/\s+(Forest|Dunes|Volcano|Reef|Quarry|Atoll)$/i, "")).join(" · ")}</p><button className="button button-primary" onClick={() => { setGrade(grade as 5 | 6); router.push("/map"); }}>Select grade <span>↗</span></button></div>
        </article>)}</div>
      </section>
    </Frame>;
  }

  if (screen === "map") {
    const activeGrade = player.grade ?? player.profile?.grade ?? 5;
    return <Frame player={player} nav="map">
      <section className="content-wrap">
        <div className="page-heading"><div><p className="eyebrow">Grade {activeGrade} · World map</p><h1>Your realms</h1></div><button className="button button-quiet" onClick={() => router.push("/grade")}>Change quest ↗</button></div>
        <WorldMapView player={player} />
      </section>
    </Frame>;
  }

  if (screen === "realm" && realmId) {
    const realm = getRealm(realmId as (typeof ENABLED_REALMS)[number]);
    const progress = player.realms[realm.id] ?? { stars: [-1, -1, -1, -1, -1], bossDefeated: false };
    const nextStage = progress.stars.findIndex((stars, index) => stars < 1 && isStageUnlocked(player, realm.id, index));
    const selectedStage = nextStage < 0 ? 4 : nextStage;
    const cleared = progress.stars.filter((value) => value >= 1).length;
    return <Frame player={player} nav="map">
      <section className={`content-wrap realm-page theme-${realm.theme}`}>
        <Link className="back-link" href="/map">← World map</Link><header className="realm-title"><div><p className="eyebrow">Grade {realm.grade} · Realm</p><h1>{realm.name}</h1><p className="lede">{realm.blurb}</p></div><span className="realm-seal">✦</span></header>
        <div className="realm-layout"><div className="stage-path" aria-label="Quest trail">
          {Array.from({ length: 5 }, (_, index) => {
            const isBoss = index === 4;
            const unlocked = isStageUnlocked(player, realm.id, index);
            const stageStars = progress.stars[index] ?? -1;
            return <button key={index} className={`stage-node ${unlocked ? "open" : "locked"} ${stageStars > 0 ? "cleared" : ""} ${index === selectedStage ? "selected" : ""}`} disabled={!unlocked} onClick={() => startStage(realm.id, index)}>
              <span>{isBoss ? "♜" : stageStars > 0 ? "★" : String(index + 1).padStart(2, "0")}</span><strong>{isBoss ? realm.bossName : `Quest ${index + 1}`}</strong><small>{stageStars > 0 ? `${stageStars} stars` : unlocked ? isBoss ? "Guardian battle" : "Ready" : "Clear the previous quest"}</small>
            </button>;
          })}
        </div><aside className="panel realm-summary"><p className="eyebrow">Realm progress</p><h2>{cleared} of 5 quests</h2><div className="progress-track"><span style={{ width: `${(cleared / 5) * 100}%` }} /></div><p className="body-copy">Guardian: <strong>{realm.bossName}</strong></p><div className="reward-list"><span>★ Stars earned <b>{progress.stars.filter((value) => value > 0).reduce((a, b) => a + b, 0)}</b></span><span>◈ Coins <b>{player.coins}</b></span><span>♥ Hearts <b>{heartsFor(player.level)}</b></span></div><button className="button button-primary full" onClick={() => startStage(realm.id, selectedStage)}>Start stage <span>↗</span></button></aside></div>
      </section>
    </Frame>;
  }

  if (screen === "battle" && realmId && stageIndex !== undefined) {
    return <BattleScreen realmId={realmId} stageIndex={stageIndex} player={player} />;
  }

  if (screen === "profile") {
    const level = levelFromXp(player.xp);
    const stats = player.lifetime ?? { answered: 0, correct: 0, stagesCleared: 0, bestCombo: 0 };
    const accuracy = stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0;
    const heroClass = player.hero ? HERO_CLASSES[player.hero.classId] : null;
    const wTier = weaponTier(player.level);
    const wName = heroClass ? weaponName(heroClass.weapon, wTier) : null;
    const displayName = heroDisplayName(player.profile?.name, player.hero ?? null);
    return <Frame player={player} nav="profile"><section className="content-wrap profile-page">
      <p className="eyebrow">Your adventurer</p><div className="profile-hero">
        <HeroPortrait hero={player.hero} playerLevel={player.level} size="lg" />
        <div><h1>{displayName}</h1><p>{titleForLevel(player.level)} · Level {player.level}</p>{heroClass && <p className="hero-class-label">{heroClass.displayName}</p>}<div className="progress-track wide"><span style={{ width: `${Math.round((level.intoLevel / level.needed) * 100)}%` }} /></div><small>{level.intoLevel} / {level.needed} XP to next level</small>{hasSave && <button className="button button-quiet" onClick={() => router.push("/create")}>Change hero</button>}</div></div>
      {heroClass && wName && <section className="hero-equipment panel">
        <p className="eyebrow">Equipment</p>
        <div className="equipment-row"><WeaponIcon weapon={heroClass.weapon} tier={wTier} size={28} /><div><strong>{wName}</strong><small>Tier {wTier} weapon</small></div></div>
        <div className="equipment-ability"><strong>Passive · {heroClass.passive.name}</strong><p>{heroClass.passive.text}</p></div>
        <div className="equipment-ability"><strong>Special · {heroClass.special.name}</strong><p>{heroClass.special.text}</p><small>Charge: {heroClass.special.chargeNeeded} correct answers · {heroClass.special.maxUses} uses per battle</small></div>
        <p className="equipment-favoured">Strong vs: {heroClass.favouredRealms.map((id) => REALMS.find((r) => r.id === id)?.name ?? id).join(" · ")} <em>(+50% damage)</em></p>
      </section>}
      <div className="stats-grid"><StatTile label="Quests completed" value={String(stats.stagesCleared)} /><StatTile label="Lifetime accuracy" value={`${accuracy}%`} /><StatTile label="Current streak" value={`${player.streak} days`} /><StatTile label="Best combo" value={`× ${stats.bestCombo}`} /></div>
      <h2 className="section-title">Badges</h2><div className="badge-grid">{BADGES.map((badge) => { const earned = player.badges.includes(badge.id); return <article key={badge.id} className={`badge-tile ${earned ? "earned" : ""}`} tabIndex={0} title={earned ? badge.description : `Locked: ${badge.description}`}><span>{earned ? "✦" : "◇"}</span><strong>{badge.name}</strong><small>{earned ? badge.description : "Locked badge"}</small></article>; })}</div>
    </section></Frame>;
  }

  if (screen === "journal") {
    const grade = player.grade ?? player.profile?.grade ?? 5;
    const realms = REALMS.filter((realm) => realm.grade === grade);
    const weakKey = weakestSubSkill(player.subSkillStats ?? {});
    const weakParts = weakKey?.split(":") ?? [];
    const weakRealm = weakParts[0] ? REALMS.find((realm) => realm.id === weakParts[0]) : undefined;
    const weakSubSkill = weakRealm?.subSkills.find((skill) => skill.id === weakParts[1]);
    const heroClass = player.hero ? HERO_CLASSES[player.hero.classId] : null;
    const displayName = heroDisplayName(player.profile?.name, player.hero ?? null);
    const wTier = weaponTier(player.level);
    return <Frame player={player} nav="journal"><section className="content-wrap journal-page">
      <p className="eyebrow">Grade {grade} · Quest journal</p>
      <div className="journal-header"><div><h1>Current skills</h1>{heroClass && <p className="eyebrow">{displayName} · {heroClass.displayName} · {weaponName(heroClass.weapon, wTier)}</p>}</div><HeroPortrait hero={player.hero} playerLevel={player.level} size="md" /></div>
      <div className="journal-panel parchment">
        {realms.map((realm) => { const skill = player.skill?.[realm.id]; const mastery = masteryPct(skill); const tier = skill?.tier ?? "easy"; const favoured = heroClass && favouredMultiplier(heroClass.id, realm.id) > 1; return <div className="skill-row" key={realm.id}><div className="skill-name"><strong>{realm.name}</strong><span className={`tier-label tier-${tier}`}>{tier.toUpperCase()}</span>{favoured && <span className="favoured-badge" title="+50% damage">⚡</span>}</div><div className="skill-track"><span className={`skill-fill tier-${tier}`} style={{ width: `${mastery}%` }} /></div><small>{mastery}% mastery</small></div>; })}
        <p className="journal-rule">↑ Up: 2 correct in a row. ↓ Down: 2 wrong in a row.{heroClass && <> · ⚡ = favoured realm (+50% dmg)</>}</p>
      </div>
      {heroClass && <section className="hero-card panel">
        <p className="eyebrow">Hero powers</p>
        <p><strong>Passive · {heroClass.passive.name}:</strong> {heroClass.passive.text}</p>
        <p><strong>Special · {heroClass.special.name}:</strong> {heroClass.special.text} <small>(charge: {heroClass.special.chargeNeeded} correct · {heroClass.special.maxUses} uses)</small></p>
        <p className="small" style={{ color: "#9ca3af" }}>Powers are active in battles. Full implementation in next update.</p>
      </section>}
      <section className="remedial panel"><div><p className="eyebrow">Remedial quest</p>{weakSubSkill ? <><h2>{weakSubSkill.title}</h2><p>One focused review can help strengthen this skill.</p></> : <><h2>No weak spots yet.</h2><p>Keep questing!</p></>}</div>{weakSubSkill && <Link className="button button-secondary" href={`/realm/${weakRealm!.id}/learn/${weakSubSkill.id}`}>Review lesson ↗</Link>}</section>
    </section></Frame>;
  }

  if (screen === "settings") {
    const settings = player.settings ?? { sound: true, music: false, motion: "system" as const, readable: false, demoMode: false, readableFont: false, reducedMotion: false, sfxEnabled: true };
    const activateDemo = () => updateSettings({ demoMode: !settings.demoMode });
    return <Frame player={player} nav="settings"><section className="content-wrap settings-page">
      <p className="eyebrow">Tune your adventure</p><h1>Settings</h1><div className="settings-columns"><section><h2>How to play</h2><ol className="how-list"><li>Answer questions to damage enemies.</li><li>Protect your hearts with shields.</li><li>Earn XP and collect coins.</li><li>Defeat Guardians to open new realms.</li></ol></section><section className="settings-list"><SettingToggle label="Sound effects" checked={settings.sound ?? settings.sfxEnabled} onChange={(checked) => updateSettings({ sound: checked, sfxEnabled: checked })} />{FEATURES.music && <SettingToggle label="Music" checked={settings.music ?? false} onChange={(checked) => updateSettings({ music: checked })} />}<label className="setting-row"><span>Reduced motion</span><select value={settings.motion ?? "system"} onChange={(event) => updateSettings({ motion: event.target.value as "system" | "reduce" | "full" })}><option value="system">Follow device</option><option value="reduce">Reduce</option><option value="full">Full motion</option></select></label><SettingToggle label="Readable mode" checked={settings.readable ?? settings.readableFont} onChange={(checked) => updateSettings({ readable: checked, readableFont: checked })} /><SettingToggle label="Demo mode: unlock all realms" checked={settings.demoMode} onChange={activateDemo} />{hasSave && <button className="button button-quiet full" onClick={() => router.push("/create")}>Change hero</button>}<button className="button button-danger full" onClick={() => setConfirmReset(true)}>Reset progress</button><button className="text-button" onClick={() => setAbout(true)}>About MathQuest ↗</button></section></div>
      {(confirmReset || about) && <div className="scrim" role="presentation"><section className="dialog panel" role="dialog" aria-modal="true"><p className="eyebrow">{confirmReset ? "Confirm reset" : "About"}</p><h2>{confirmReset ? "Erase all progress?" : "AI and art disclosure"}</h2>{confirmReset ? <p>Your profile, quests, badges, and settings will be reset on this device.</p> : <><p>Questions and lessons may use AI-generated content that is checked by deterministic verification before play. The realm scenes, characters, and illustration plates are pixel-art generated offline by a script (see Art credits).</p><p>Art credits: the committed illustrations are script-generated pixel-art, not AI, because the free Pollinations image service was unavailable during development. Running <code>npm run art:gen</code> then <code>npm run art:process</code> regenerates them as real AI art when the service is available. Diagrams are always drawn by code. No reference-board image is used in the app.</p><a className="text-button" href="/docs/ART_CREDITS.md" target="_blank" rel="noreferrer">Read full art credits ↗</a></>}<div className="button-row"><button className="button button-quiet" onClick={() => { setConfirmReset(false); setAbout(false); }}>Cancel</button>{confirmReset && <button className="button button-danger" onClick={() => { resetAll(); setConfirmReset(false); router.push("/"); }}>Erase progress</button>}</div></section></div>}
    </section></Frame>;
  }

  return null;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return <article className="stat-tile panel"><small>{label}</small><strong>{value}</strong></article>;
}

function SettingToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="setting-row"><span>{label}</span><input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}

function toPools(questions: VerifiedQuestion[]): Pools {
  const pools: Pools = { easy: [], medium: [], hard: [] };
  for (const question of questions) pools[question.tier].push(question);
  return pools;
}

function BattleScreen({ realmId, stageIndex, player }: { realmId: string; stageIndex: number; player: Player }) {
  const router = useRouter();
  const realm = getRealm(realmId as (typeof ENABLED_REALMS)[number]);
  const spec = stageSpec(realm, stageIndex);
  const unlocked = isStageUnlocked(player, realmId, stageIndex);
  const { questions, loading, error, source } = useQuestions(realmId, stageIndex);
  const pools = useMemo(() => toPools(questions), [questions]);
  const { state, dispatch } = useBattle({ player, realmId, stageIndex, pools, mode: spec.kind as BattleMode });
  const sfx = useSfx();
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [answerProtection, setAnswerProtection] = useState<{ hearts: number; shield: boolean } | null>(null);
  const [initialBadges] = useState(() => player.badges ?? []);
  const [motionKey, setMotionKey] = useState(0);
  const [motionKind, setMotionKind] = useState<"correct" | "wrong" | null>(null);
  const onKeyboardAnswer = (index: number) => {
    setPickedIndex(index);
    setAnswerProtection({ hearts: state.hearts, shield: state.shieldActive });
    const correct = state.currentQuestion?.correctIndex === index;
    setMotionKind(correct ? "correct" : "wrong");
    setMotionKey((key) => key + 1);
    sfx(correct ? "correct" : "wrong");
    if (correct) sfx("hit");
  };
  useKeyboardAnswers(dispatch, onKeyboardAnswer);
  const applied = useRef(false);
  const applyResult = useGameStore((store) => store.applyResult);
  const commitItems = useGameStore((store) => store.commitItems);
  const ending = state.phase === "won" || state.phase === "lost";
  const resultReason = state.endReason;
  const resultHistory = state.history;
  const resultUsedItems = state.used;
  const resultWon = state.phase === "won";
  const resultXp = state.xp;
  const resultCorrect = state.correctCount;
  const resultWrong = state.wrongCount;
  const resultAdaptiveTier = state.adaptive.tier;

  useEffect(() => {
    if (state.phaseJustChanged) sfx("boss-phase");
  }, [sfx, state.phaseJustChanged]);

  useEffect(() => {
    if (ending && !applied.current) {
      if (loading || (resultReason === "pool_exhausted" && resultHistory.length === 0)) return;
      applied.current = true;
      const won = resultWon;
      const stars = starsFor(resultWrong, won);
      const result = {
        realmId,
        stageIndex,
        won,
        stars,
        xp: resultXp,
        coins: coinsFor({ correctCount: resultCorrect, stars, isBoss: spec.kind === "boss", won }),
        correctCount: resultCorrect,
        wrongCount: resultWrong,
        isBoss: spec.kind === "boss",
        history: resultHistory,
        endTier: resultAdaptiveTier,
      };
      applyResult(result);
      commitItems(resultUsedItems);
      if (useGameStore.getState().player.level > player.level) sfx("level-up");
      if (won) sfx("victory");
      try {
        const seenKey = `mq:seen:${realmId}`;
        const prior = JSON.parse(localStorage.getItem(seenKey) ?? "[]") as string[];
        const usedStems = questions.filter((question) => resultHistory.some((entry) => entry.id === question.id)).map((question) => question.stem);
        localStorage.setItem(seenKey, JSON.stringify([...prior, ...usedStems].slice(-24)));
        sessionStorage.removeItem(`mq:questions:${realmId}:${stageIndex}`);
      } catch {
        // Storage can be disabled; finishing the battle must still work.
      }
    }
  }, [applyResult, commitItems, ending, loading, player.level, questions, realmId, resultAdaptiveTier, resultCorrect, resultHistory, resultReason, resultUsedItems, resultWon, resultWrong, resultXp, sfx, spec.kind, stageIndex]);

  if (loading) return <main className="battle-loading">Preparing verified questions…</main>;
  if (!unlocked) return <main className="battle-loading"><p>This quest is locked. Clear the previous quest to continue.</p><button className="button button-secondary" onClick={() => router.push(`/realm/${realmId}`)}>Back to realm</button></main>;
  if (error || questions.length === 0) return <main className="battle-loading"><p>Questions are not available for this stage yet.</p><p>{error ?? "Add verified seed questions or configure live question generation on the server."}</p><button className="button button-secondary" onClick={() => router.back()}>Back to realm</button></main>;

  const question = state.currentQuestion;
  const verdict = state.verdict;
  const sourceTag = source === "cache" ? "cache" : question?.source ?? source;
  const answer = (index: number) => {
    const correct = question?.correctIndex === index;
    sfx(correct ? "correct" : "wrong");
    if (correct) sfx("hit");
    dispatch({ type: "ANSWER", picked: index });
  };
  const win = state.phase === "won";
  const accuracy = state.history.length ? Math.round((state.correctCount / state.history.length) * 100) : 0;
  const encouragement = pick(ACCURACY_COPY[accuracyBracket(accuracy)], state.correctCount + state.wrongCount);
  const displayName = heroDisplayName(player.profile?.name, player.hero ?? null);
  const isFavoured = player.hero && HERO_CLASSES[player.hero.classId]?.favouredRealms.includes(realmId);

  return <main className={`battle-page ${player.settings?.readable ? "readable" : ""}`}>
    <header className="battle-top"><Link href={`/realm/${realmId}`} className="back-link">← Leave battle</Link><span className="source-tag">{sourceTag}</span><span>♥ {state.hearts}</span><span>Combo × {state.combo}</span><span>XP {player.xp + state.xp}</span><span>◈ {player.coins}</span></header>
    <div className={`arena panel ${motionKind === "wrong" ? "arena-shake" : ""} ${state.specialArmed ? "special-armed" : ""}`} key={`arena-${motionKey}`}>
      <div className={`fighter hero-fighter ${motionKind === "correct" ? "hero-lunge" : ""}`}>
        <small>PLAYER</small>
        <HeroPortrait hero={player.hero} playerLevel={player.level} size="md" className="fighter-art hero-art" />
        <strong>{displayName}</strong>
        {player.hero && <>
          <small className="hero-class-badge">{HERO_CLASSES[player.hero.classId].displayName}</small>
          <small className="hero-passive-badge" title={HERO_CLASSES[player.hero.classId].passive.text}>✦ {HERO_CLASSES[player.hero.classId].passive.name}</small>
        </>}
        <span>{"♥ ".repeat(Math.max(0, state.hearts))}</span>
      </div>
      <div className="arena-center">
        <p className="eyebrow">{spec.kind === "boss" ? realm.bossName : realm.name}</p>
        <h1>{spec.kind === "boss" ? "Guardian battle" : "Realm encounter"}</h1>
        {isFavoured && <p className="favoured-banner">✦ {displayName} is strong against {realm.name}! (+50% damage)</p>}
        <div className="enemy-meter"><span style={{ width: `${Math.max(0, (state.enemyHp / state.enemyMax) * 100)}%` }} /></div>
        <small>{state.enemyHp} / {state.enemyMax} HP {spec.kind === "boss" && `· Phase ${state.enemyHp / state.enemyMax > 0.66 ? 1 : state.enemyHp / state.enemyMax > 0.33 ? 2 : 3}`}</small>
        {state.phaseJustChanged && <p className="phase-banner">PHASE SHIFT · {realm.bossTaunt}</p>}
      </div>
      <div className={`fighter enemy-fighter ${state.verdict?.correct ? "enemy-hit" : ""} ${motionKind === "correct" && player.hero ? `attack-${HERO_CLASSES[player.hero.classId].weapon}` : ""}`}>
        <small>{spec.kind === "boss" ? "GUARDIAN" : "ENEMY"}</small>
        <span className="fighter-art enemy-art">{spec.kind === "boss" ? "♜" : "♟"}</span>
        <strong>{spec.kind === "boss" ? realm.bossName : "Realm guardian"}</strong>
      </div>
    </div>
    {state.phase === "won" || state.phase === "lost" ? <section className="results-panel parchment" aria-live="polite">
      <p className={`ribbon ${win ? "ribbon-win" : "ribbon-loss"}`}>{win ? "QUEST COMPLETE!" : "RETREAT!"}</p>
      {win && !player.settings?.readable && <div className="pixel-particles" aria-hidden="true">✦　▪　✦　▪　✦</div>}
      <div className="results-hero">
        <HeroPortrait hero={player.hero} playerLevel={player.level} size="md" />
        <strong>{displayName}</strong>
      </div>
      <div className="result-stars">{"★".repeat(starsFor(state.wrongCount, win))}{"☆".repeat(3 - starsFor(state.wrongCount, win))}</div>
      <div className="results-stats"><StatTile label="XP" value={`+${state.xp}`} /><StatTile label="Coins" value={`+${coinsFor({ correctCount: state.correctCount, stars: starsFor(state.wrongCount, win), isBoss: spec.kind === "boss", won: win })}`} /><StatTile label="Accuracy" value={`${accuracy}%`} /><StatTile label="Combo" value={`×${state.bestCombo}`} /></div>
      <strong className="score-line">SCORE: {state.correctCount} of {state.history.length} correct</strong>
      <p>{encouragement}</p>
      <div className="result-progress"><span>Realm progress</span><div className="progress-track"><span style={{ width: `${((player.realms[realmId]?.stars.filter((value) => value > 0).length ?? 0) / 5) * 100}%` }} /></div></div>
      {player.badges.some((badge) => !initialBadges.includes(badge)) && <div className="new-badges"><strong>Badge unlocked</strong>{player.badges.filter((badge) => !initialBadges.includes(badge)).map((badge) => <span key={badge}>{BADGES.find((item) => item.id === badge)?.name ?? badge}</span>)}</div>}
      {!win && <div className="remedial-scroll"><strong>Review these answers</strong>{state.history.filter((entry) => !entry.correct).map((entry) => { const missed = new Map(questions.map((item) => [item.id, item])).get(entry.id); return missed ? <p key={entry.id}>{missed.stem} Correct answer: {missed.options[missed.correctIndex]?.label}. {missed.explanation}</p> : null; })}</div>}
      <div className="button-row"><button className="button button-primary" onClick={() => router.push(`/realm/${realmId}`)}>{win ? "Continue quest" : "Retry"}</button><button className="button button-secondary" onClick={() => router.push("/map")}>World map</button></div>
    </section> : <section className="question-panel parchment" aria-live="polite">
      {state.phase === "feedback" && verdict ? <>
        <p className={`ribbon ${verdict.correct ? "ribbon-win" : "ribbon-loss"}`}>{verdict.correct ? "CORRECT!" : "NOT QUITE"}</p>
        {state.heroFx.length > 0 && <div className="hero-fx-banner">{state.heroFx.map((fx, i) => <span key={`${fx}-${i}`} className="hero-fx-chip">{fx}</span>)}</div>}
        <div className="feedback-awards"><span>+{verdict.correct && question ? damageFor(question.tier, state.combo) : 0} DAMAGE</span><span>+{verdict.correct && question ? xpForAnswer(question.tier, state.combo) : 0} XP</span><span>Combo × {state.combo}</span></div>
        <div className="answer-grid feedback-options">{question?.options.map((option, index) => <div key={`${question.id}-${index}`} className={`answer-option ${index === verdict.correctIndex ? "answer-correct" : ""} ${!verdict.correct && index === pickedIndex ? "answer-wrong" : ""}`}><span>{String.fromCharCode(65 + index)}</span>{option.label}{index === verdict.correctIndex ? " ✓" : ""}{!verdict.correct && index === pickedIndex ? " ×" : ""}</div>)}</div>
        <h2>Professor&apos;s note</h2><p>{verdict.explanation}</p><p className="math-check">Check: {verdict.check}</p>
        {!verdict.correct && <p>Why that choice: {verdict.pickedWhy || "Review the operation and calculate again."}</p>}
        {!verdict.correct && <p>{answerProtection?.shield ? "SHIELD BLOCKED: your shield absorbed this miss." : "HEART LOST: review the solution and try again."}</p>}
        <div className="button-row"><button className="button button-primary" autoFocus onClick={() => dispatch({ type: "NEXT" })}>Next question ↗</button></div>
      </> : question ? <>
        <p className="eyebrow">Question {state.qIndex + 1} of {state.total}</p>
        <div className="progress-track"><span style={{ width: `${((state.qIndex + 1) / state.total) * 100}%` }} /></div>
        <h2 className="question-stem">{question.stem}</h2>
        <div className="answer-grid">{question.options.map((option, index) => { const hidden = state.hidden.includes(index); return <button key={`${question.id}-${index}`} className="answer-option" onClick={() => { setPickedIndex(index); setAnswerProtection({ hearts: state.hearts, shield: state.shieldActive }); setMotionKind(question.correctIndex === index ? "correct" : "wrong"); setMotionKey((key) => key + 1); answer(index); }} disabled={state.phase !== "question" || hidden}><span>{String.fromCharCode(65 + index)}</span>{hidden ? "" : option.label}</button>; })}</div>
        {state.hintShown && <p className="hint-copy">Hint: {question.hint}</p>}
        <p className="tier-chip">{question.tier.toUpperCase()} · {spec.kind === "boss" ? `PHASE ${state.enemyHp / state.enemyMax > 0.66 ? 1 : state.enemyHp / state.enemyMax > 0.33 ? 2 : 3}` : "QUEST"}</p>
        <div className="power-row">
          <button className="power-button" disabled={state.loadout.hint <= 0 || state.hintShown || state.phase !== "question"} onClick={() => { sfx("click"); dispatch({ type: "POWER", item: "hint" }); }}>Bulb · {state.loadout.hint}</button>
          <button className="power-button" disabled={state.loadout.shield <= 0 || state.shieldActive || state.phase !== "question"} onClick={() => { sfx("click"); dispatch({ type: "POWER", item: "shield" }); }}>Shield · {state.loadout.shield}</button>
          <button className="power-button" disabled={state.loadout.fifty <= 0 || state.hidden.length > 0 || state.phase !== "question"} onClick={() => { sfx("click"); dispatch({ type: "POWER", item: "fifty" }); }}>50/50 · {state.loadout.fifty}</button>
          {player.hero && (() => {
            const heroClass = HERO_CLASSES[player.hero.classId];
            const ready = state.phase === "question" && state.specialCharge >= heroClass.special.chargeNeeded && state.specialUsesLeft > 0;
            const pips = "●".repeat(state.specialCharge) + "○".repeat(Math.max(0, heroClass.special.chargeNeeded - state.specialCharge));
            return (
              <button
                className={`power-button special-button ${ready ? "special-ready" : ""}`}
                disabled={!ready}
                onClick={() => {
                  sfx("click");
                  dispatch({ type: "SPECIAL" });
                }}
                title={`${heroClass.special.name}: ${heroClass.special.text} (Press P)`}
              >
                ★ {heroClass.special.name} [{pips}] ({state.specialUsesLeft})
              </button>
            );
          })()}
        </div>
      </> : <p>Preparing next question…</p>}
    </section>}
    <span className="sr-only" aria-live="polite">{state.phase === "won" || state.phase === "lost" ? "Stage results saved." : ""}</span>
    {(state.phase === "won" || state.phase === "lost") && <BottomNav active="map" />}
  </main>;
}
