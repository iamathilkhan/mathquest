import Link from "next/link";

export default function NotFound() {
  return <main className="system-screen"><section className="dialog panel"><p className="eyebrow">Unknown realm</p><h1>This path is not on the map.</h1><p>Choose a realm from your world map and continue your quest.</p><Link className="button button-primary" href="/map">Return to world map</Link></section></main>;
}
