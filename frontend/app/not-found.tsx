import Link from "next/link";
import { ArrowLeft, Compass, Layout } from "lucide-react";
import { Footer, Navbar } from "@/components/landing";

export default function NotFound() {
  return (
    <div className="marketing">
      <Navbar />
      <main className="not-found" style={{ background: "radial-gradient(circle at 50% 20%, rgba(249,115,22,0.18) 0%, rgba(5,11,24,0) 55%), var(--brand-dark)" }}>
        <div style={{ maxWidth: 540, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "var(--radius-xl)",
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              boxShadow: "0 8px 30px rgba(249,115,22,0.45)",
            }}
          >
            <Compass size={36} />
          </div>
          <span className="eyebrow" style={{ marginBottom: 12 }}>
            404 &middot; PAGE NOT FOUND
          </span>
          <h1 style={{ fontSize: "2.5rem", marginBottom: 12, color: "#ffffff" }}>
            Route outside the map.
          </h1>
          <p style={{ color: "var(--brand-slate-400)", fontSize: "1rem", lineHeight: 1.6, marginBottom: 24 }}>
            The destination you requested may have moved, been reorganized, or does not exist.
            Explore the available areas below or jump directly into the Studio.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <Link className="button button-primary" href="/studio">
              <Layout size={15} /> Open Studio
            </Link>
            <Link className="button button-outline" href="/">
              <ArrowLeft size={15} /> Return Home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
