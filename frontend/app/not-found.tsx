import Link from "next/link";

export default function NotFound() {
  return <main className="not-found"><span className="eyebrow">404 · ROUTE NOT FOUND</span><h1>This page is outside the map.</h1><p>The page may have moved, or the address may be incorrect.</p><Link className="button button-orange" href="/">Return home <span>↗</span></Link></main>;
}
