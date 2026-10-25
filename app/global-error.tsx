"use client";

import "./globals.css";

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <html lang="en"><body><main className="system-screen"><section className="dialog panel"><p className="eyebrow">Quest paused</p><h1>MathQuest needs a moment.</h1><p>Your local save is not erased. Reload this screen to continue.</p><button className="button button-primary" onClick={() => retry()}>Try again</button></section></main></body></html>;
}
