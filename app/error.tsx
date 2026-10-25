"use client";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main className="system-screen"><section className="dialog panel"><p className="eyebrow">Quest paused</p><h1>Something went wrong.</h1><p>Your saved progress stays on this device. Try the page again or return to the world map.</p><div className="button-row"><button className="button button-primary" onClick={() => retry()}>Try again</button><a className="button button-secondary" href="/map">World map</a></div></section></main>;
}
