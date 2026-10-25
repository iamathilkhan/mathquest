import { HeroCreationFlow } from "@/components/HeroCreationFlow";

export default function CreatePage() {
  return (
    <main className="app-frame">
      <header className="topbar">
        <span className="wordmark">
          MATH<span>QUEST</span>
        </span>
      </header>
      <section className="content-wrap" style={{ marginTop: "40px" }}>
        <HeroCreationFlow isNewGame={true} />
      </section>
    </main>
  );
}
