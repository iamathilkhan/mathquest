"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { getRealm, stageSpec } from "@/data/curriculum";
import type { RealmId } from "@/lib/config";
import { Diagram } from "@/components/diagrams/Diagrams";
import { ArtImage } from "@/components/ArtImage";
import { VideoPlayer } from "@/components/lesson/VideoPlayer";
import { useLesson } from "@/hooks/useLesson";
import { useHydrated } from "@/hooks/useHydrated";
import { useGameStore } from "@/store/gameStore";

export function LearnView({ realmId, subSkillId }: { realmId: string; subSkillId: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const realm = getRealm(realmId as RealmId);
  const subSkill = realm.subSkills.find((skill) => skill.id === subSkillId)!;
  const { lesson, source, status, error, notice } = useLesson(realmId, subSkillId);
  const markLessonFinished = useGameStore((store) => store.markLessonFinished);
  const player = useGameStore((store) => store.player);
  const [tab, setTab] = useState<"read" | "picture" | "video">("read");
  const [page, setPage] = useState(0);
  const [step, setStep] = useState(0);
  const [plateLoaded, setPlateLoaded] = useState(false);

  const pages = useMemo(() => lesson ? [
    { kind: "idea" as const },
    ...lesson.workedExamples.map((_, index) => ({ kind: "example" as const, index })),
    { kind: "mistakes" as const },
    { kind: "real" as const },
  ] : [], [lesson]);

  const lessonStage = [0, 1, 2, 3, 4].find((index) => stageSpec(realm, index).subSkillIds.includes(subSkillId)) ?? 0;

  const startBattle = () => {
    const unfinished = [0, 1, 2, 3, 4].find((index) => {
      const ids = stageSpec(realm, index).subSkillIds;
      return ids.includes(subSkillId) && (player.realms[realmId]?.stars[index] ?? -1) < 1;
    });
    const stageIndex = unfinished ?? 0;
    router.push(`/battle/${realmId}/${stageIndex}`);
  };

  if (!hydrated || status === "loading") return <main className="loading-screen">Loading learning scroll…</main>;
  if (!lesson) return <main className="lesson-placeholder"><p className="eyebrow">Lesson unavailable</p><h1>{subSkill.title}</h1><p>{error ?? "A lesson could not be loaded."}</p><Link href={`/battle/${realmId}/${lessonStage}`} className="button button-primary">Skip lesson · start quest</Link></main>;

  const currentPage = pages[page];
  const example = currentPage?.kind === "example" ? lesson.workedExamples[currentPage.index] : undefined;
  const lastPage = page === pages.length - 1;
  const showGotIt = lastPage;

  const advance = () => {
    if (lastPage) {
      markLessonFinished(subSkillId);
      setTab("picture");
      return;
    }
    setPage((current) => current + 1);
    setStep(0);
  };

  return <main className={`app-frame learn-page theme-${realm.theme}`}>
    <header className="learn-topbar"><Link href={`/realm/${realmId}`} className="back-link">← {realm.name}</Link><div><p className="eyebrow">{realm.name} · {source}</p><h1>{subSkill.title}</h1></div><Link href={`/battle/${realmId}/${lessonStage}`} className="skip-lesson">Skip lesson →</Link></header>
    <div className="learn-layout"><aside className="mentor-panel"><div className="mentor-fallback" aria-hidden="true">✧</div><strong>Math mentor</strong><p>Let&apos;s make this idea clear, one step at a time.</p><div className="subskill-chips">{realm.subSkills.map((skill) => <span className={skill.id === subSkillId ? "active" : ""} key={skill.id}>{skill.title}</span>)}</div></aside>
      <section className="learn-main">
        <div className="book-tabs" role="tablist" aria-label="Lesson format">
          <button role="tab" aria-selected={tab === "read"} onClick={() => setTab("read")}>READ</button>
          <button role="tab" aria-selected={tab === "picture"} onClick={() => setTab("picture")}>PICTURE</button>
          <button role="tab" aria-selected={tab === "video"} onClick={() => setTab("video")}>VIDEO</button>
        </div>
        {notice && <p className="lesson-notice" role="status">{notice}</p>}
        {tab === "read" && <article className="lesson-paper parchment" role="tabpanel">
          <p className="eyebrow">{currentPage?.kind === "idea" ? "Big idea" : currentPage?.kind === "example" ? `Worked example ${currentPage.index + 1}` : currentPage?.kind === "mistakes" ? "Common mistake" : "Real world"}</p>
          {currentPage?.kind === "idea" && <><h2>{lesson.title}</h2><p className="lesson-long">{lesson.hook}</p><p className="lesson-long">{lesson.bigIdea}</p><div className="vocab-list">{lesson.vocabulary.map((item) => <details key={item.term}><summary>{item.term}</summary><p>{item.definition}</p></details>)}</div></>}
          {example && <><h2>{example.problem}</h2><ol className="worked-steps">{example.steps.slice(0, step).map((item, index) => <li key={index}>{item}</li>)}</ol>{step < example.steps.length ? <button className="button button-secondary" onClick={() => setStep((current) => current + 1)}>Show next step</button> : <p className="lesson-answer">Answer: {example.answerValue}</p>}</>}
          {currentPage?.kind === "mistakes" && <><h2>Watch for these</h2><ul>{lesson.commonMistakes.map((mistake) => <li key={mistake}>{mistake}</li>)}</ul></>}
          {currentPage?.kind === "real" && <><h2>Math outside the classroom</h2><p className="lesson-long">{lesson.realWorld}</p></>}
          <footer className="lesson-pagination"><button className="button button-quiet" disabled={page === 0} onClick={() => { setPage((current) => current - 1); setStep(0); }}>← Back</button><span>{page + 1} / {pages.length}</span><button className="button button-primary" onClick={advance}>{showGotIt ? "GOT IT!" : "Next →"}</button></footer>
        </article>}
        {tab === "picture" && <article className="lesson-paper parchment picture-paper" role="tabpanel">
          <h2>{lesson.infographic.headline}</h2><div className="picture-grid"><div className="plate-wrap"><ArtImage slot={`plate-${realmId}` as `plate-${RealmId}`} className="art-plate" fallback={realm.name} onAssetState={setPlateLoaded} /><small>{plateLoaded ? "Illustration generated by script; diagram drawn by code." : "Illustration unavailable; diagram drawn by code."}</small></div><div className="diagram-wrap"><Diagram kind={lesson.infographic.diagram} data={lesson.scenes.find((scene) => scene.visual === lesson.infographic.diagram)?.visualData} /></div></div>
          <div className="mentor-caption"><strong>Mentor&apos;s notes</strong><ul>{lesson.infographic.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul></div><footer className="lesson-pagination"><button className="button button-quiet" onClick={() => setTab("read")}>← Back</button><button className="button button-secondary" onClick={() => setTab("video")}>Next: VIDEO →</button><button className="button button-primary" onClick={startBattle}>Start battle</button></footer>
        </article>}
        {tab === "video" && <article className="lesson-paper parchment" role="tabpanel"><VideoPlayer scenes={lesson.scenes} /><footer className="lesson-pagination"><button className="button button-quiet" onClick={() => setTab("picture")}>← Back</button><button className="button button-primary" onClick={startBattle}>Start battle</button></footer></article>}
        <span className="source-tag lesson-source">{source}</span>
      </section>
    </div>
    <nav className="bottom-nav" aria-label="Main navigation"><Link href="/map"><span>⌂</span>Home</Link><Link href="/journal"><span>▤</span>Quests</Link><Link href="/profile"><span>☆</span>Profile</Link></nav>
  </main>;
}
