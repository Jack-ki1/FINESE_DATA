"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  GraduationCap,
  HeartPulse,
  Landmark,
  Moon,
  Play,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sprout,
  Sun,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { THEME_KEY } from "@/lib/data";

export const navLinks = [
  { href: "/platform", label: "Platform" },
  { href: "/solutions", label: "Solutions" },
  { href: "/resources", label: "Resources" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
];

const TILE_CLASSES = ["tile-orange", "tile-sky", "tile-emerald", "tile-violet", "tile-rose", "tile-amber"];
const ACCENT_HEX = ["#f97316", "#0ea5e9", "#10b981", "#8b5cf6", "#f43f5e", "#f59e0b"];

export function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <Link
      className={`brand ${footer ? "brand-footer" : ""}`}
      href="/"
      aria-label="FINESE DATA home"
    >
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-dot" />
        <span className="brand-dot" />
        <span className="brand-dot" />
      </span>
      <span className="brand-word">
        <strong>FINESE</strong>
        <strong>DATA</strong>
        {footer && <span className="brand-tag">Browser-local data studio</span>}
      </span>
    </Link>
  );
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === "light" || saved === "dark") {
          setTheme(saved);
          document.documentElement.setAttribute("data-theme", saved);
        } else {
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          const initial = prefersDark ? "dark" : "light";
          setTheme(initial);
          document.documentElement.setAttribute("data-theme", initial);
        }
      } catch {
        // localStorage may be unavailable
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // ignore
    }
  };

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="announcement">
        <Sparkles size={14} />
        <span>FINESE Studio is 100% browser-local. Your data never leaves your device.</span>
      </div>
      <nav className="nav container">
        <Brand />
        <div className="nav-links">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="nav-link">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="nav-actions">
          <ThemeSwitcher />
          <Link href="/contact" className="nav-link nav-contact">
            Contact
          </Link>
          <Link href="/studio" className="button button-primary">
            Open Studio <ArrowRight size={14} />
          </Link>
          <button
            className="mobile-menu-toggle"
            aria-expanded={open}
            aria-label="Toggle navigation"
            onClick={() => setOpen(!open)}
            style={{ color: "#ffffff" }}
          >
            {open ? <X size={20} /> : "☰"}
          </button>
        </div>
      </nav>
      {open && (
        <div className="mobile-panel" onClick={() => setOpen(false)}>
          <div className="mobile-panel-inner" onClick={(e) => e.stopPropagation()}>
            <button className="mobile-close" aria-label="Close menu" onClick={() => setOpen(false)}>
              <X size={20} />
            </button>
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} className="mobile-link" onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            <div className="mobile-divider" />
            <Link href="/contact" className="mobile-link" onClick={() => setOpen(false)}>
              Contact
            </Link>
            <Link href="/studio" className="button button-primary mobile-cta" onClick={() => setOpen(false)}>
              Open Studio <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand-col">
          <Brand footer />
          <p className="footer-desc">
            The privacy-first data workspace. Profile, clean, query and chart CSV files
            in your browser memory without cloud exposure.
          </p>
          <div className="footer-social">
            <a href="#" aria-label="LinkedIn">in</a>
            <a href="#" aria-label="Twitter">t</a>
            <a href="#" aria-label="Facebook">f</a>
            <a href="#" aria-label="Instagram">i</a>
          </div>
        </div>
        <div className="footer-cols">
          <div className="footer-col">
            <strong>Studio Tools</strong>
            <Link href="/studio">Overview</Link>
            <Link href="/studio/data">Data Review</Link>
            <Link href="/studio/clean">Smart Cleaning</Link>
            <Link href="/studio/charts">Chart Builder</Link>
            <Link href="/studio/sql">SQL Lab</Link>
            <Link href="/studio/export">Export Center</Link>
          </div>
          <div className="footer-col">
            <strong>Platform</strong>
            <Link href="/platform">Architecture</Link>
            <Link href="/solutions">Solutions</Link>
            <Link href="/resources">Resource Library</Link>
            <Link href="/services">Services</Link>
            <Link href="/about">About Us</Link>
          </div>
          <div className="footer-col">
            <strong>Governance</strong>
            <Link href="/privacy">Privacy Notice</Link>
            <Link href="/terms">Terms of Use</Link>
            <Link href="/accessibility">Accessibility</Link>
            <Link href="/contact">Contact Team</Link>
          </div>
        </div>
        <div className="footer-note">
          <div>
            © {new Date().getFullYear()} FINESE DATA. Built for real datasets with zero cloud compromise.
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <span style={{ color: "#f97316" }}>● 100% Client Memory</span>
            <span style={{ color: "#f97316" }}>● Verifiable Offline</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Mini interactive demo widget for the landing page
function InteractiveDemoWidget() {
  const [selectedCol, setSelectedCol] = useState<"region" | "segment" | "quarter">("region");

  const dataSets: Record<"region" | "segment" | "quarter", { label: string; count: number }[]> = {
    region: [
      { label: "Nairobi", count: 8 },
      { label: "Nakuru", count: 6 },
      { label: "Mombasa", count: 5 },
      { label: "Eldoret", count: 4 },
      { label: "Kisumu", count: 3 },
    ],
    segment: [
      { label: "Enterprise", count: 9 },
      { label: "Retail", count: 8 },
      { label: "Logistics", count: 4 },
      { label: "Manufacturing", count: 3 },
      { label: "Agriculture", count: 2 },
    ],
    quarter: [
      { label: "Q1 2026", count: 8 },
      { label: "Q2 2026", count: 8 },
      { label: "Q3 2026", count: 8 },
    ],
  };

  const current = dataSets[selectedCol];
  const max = Math.max(...current.map((c) => c.count));

  return (
    <div className="teaser-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="eyebrow" style={{ marginBottom: 4 }}>LIVE IN-BROWSER PREVIEW</span>
          <h3 style={{ margin: 0 }}>Instant Frequency Profiler</h3>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(["region", "segment", "quarter"] as const).map((col) => (
            <button
              key={col}
              onClick={() => setSelectedCol(col)}
              className={`studio-button ${selectedCol === col ? "primary" : ""}`}
              style={{ textTransform: "capitalize" }}
            >
              {col}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--color-bg)", padding: 18, borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-muted)", marginBottom: 12 }}>
          <span>Distribution for column: <b>{selectedCol}</b></span>
          <span className="type-chip">LOCAL CALCULATION</span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 160, borderBottom: "1px solid var(--color-border)", paddingBottom: 6 }}>
          {current.map((item) => {
            const pct = Math.round((item.count / max) * 100);
            return (
              <div key={item.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#f97316", marginBottom: 4 }}>{item.count}</span>
                <div
                  style={{
                    width: "100%",
                    height: `${pct}%`,
                    background: "linear-gradient(180deg, #f97316 0%, rgba(249,115,22,0.35) 100%)",
                    borderRadius: "6px 6px 0 0",
                    transition: "height 0.3s ease",
                  }}
                />
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingTop: 8 }}>
          {current.map((item) => (
            <span key={item.label} style={{ flex: 1, textAlign: "center", fontSize: 11, color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, fontSize: 12, color: "var(--color-text-muted)", flexWrap: "wrap", gap: 8 }}>
        <span>Calculated client-side in under 1 millisecond.</span>
        <Link href="/studio?sample=sales" className="text-link" style={{ fontWeight: 700, color: "#f97316", display: "flex", alignItems: "center", gap: 4 }}>
          Launch full studio with this data <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

const INDUSTRIES = [
  {
    title: "Financial Services",
    text: "Risk modelling, fraud signals and regulatory reporting built on clearly defined measures.",
    image: "/images/industries/finance-vibrant.jpg",
    icon: Landmark,
    tile: "tile-emerald",
  },
  {
    title: "Healthcare Operations",
    text: "Capacity, service volumes and resource views — handled with privacy-led discipline.",
    image: "/images/industries/healthcare-vibrant.jpg",
    icon: HeartPulse,
    tile: "tile-rose",
  },
  {
    title: "Retail & E-commerce",
    text: "Demand patterns, stock visibility and customer segmentation by product, place and time.",
    image: "/images/industries/retail-vibrant.jpg",
    icon: ShoppingBag,
    tile: "tile-orange",
  },
  {
    title: "Telecommunications",
    text: "Retention questions, network insight and subscriber analytics from clean source data.",
    image: "/images/industries/telecom-vibrant.jpg",
    icon: Wifi,
    tile: "tile-sky",
  },
  {
    title: "Education & Research",
    text: "Repeatable analysis habits, dataset quality checks and explainable visual summaries.",
    image: "/images/industries/education-vibrant.jpg",
    icon: GraduationCap,
    tile: "tile-violet",
  },
  {
    title: "Agriculture & Logistics",
    text: "Production, weather, input and movement data brought together to explore real patterns.",
    image: "/images/industries/agriculture-vibrant.jpg",
    icon: Sprout,
    tile: "tile-teal",
  },
];

const SHOWCASES = [
  {
    tag: "Telecoms",
    title: "Retention & network questions",
    text: "Frame churn and coverage questions around clean subscriber data, with explicit metrics and honest limits.",
    image: "/images/cases/telecom-tower.jpg",
  },
  {
    tag: "Financial services",
    title: "Risk & reporting pipelines",
    text: "Tidy source data, define business measures and produce reporting that shows its own definitions.",
    image: "/images/cases/bank-headquarters.jpg",
  },
  {
    tag: "Operations",
    title: "Supply chain & plant analytics",
    text: "Assess throughput, stock and quality signals with a verifiable trail of what was changed.",
    image: "/images/cases/industrial-smart.jpg",
  },
];

export function LandingPage() {
  return (
    <div className="marketing">
      <Navbar />
      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">
                <Sparkles size={13} />
                BROWSER-LOCAL DATA STUDIO
              </span>
              <h1>
                Clean, profile and query any CSV <span className="text-orange">locally</span> in your
                browser.
              </h1>
              <p className="hero-lede">
                Import your dataset, profile column distributions, eliminate duplicates, and run
                safe queries with zero cloud exposure. Built for data analysts who demand complete
                privacy and speed.
              </p>
              <div className="hero-actions">
                <Link href="/studio" className="button button-primary">
                  Launch FINESE Studio <ArrowRight size={16} />
                </Link>
                <Link href="/studio?sample=sales" className="button button-outline">
                  <Play size={14} /> Try Demo Dataset
                </Link>
              </div>
              <div className="hero-assurance">
                <span><ShieldCheck size={14} color="#10b981" /> 100% Client-Side Memory</span>
                <span><Zap size={14} color="#fbbf24" /> Sub-millisecond Compute</span>
                <span><CheckCircle2 size={14} color="#38bdf8" /> No Account or Key Needed</span>
              </div>
            </div>

            <div className="hero-visual">
              <div className="hero-visual-glow" aria-hidden="true" />
              <div className="hero-visual-back" aria-hidden="true">
                <Image
                  src="/images/hero/hero-tech.jpg"
                  alt=""
                  width={520}
                  height={360}
                  priority
                />
              </div>
              <div className="image-block">
                <Image
                  src="/images/hero/hero-analytics.jpg"
                  alt="Colorful analytics dashboard reviewed on a laptop"
                  width={1200}
                  height={760}
                  priority
                />
              </div>
              <div className="float-chip chip-orange chip-a">
                <ShieldCheck size={14} /> Zero uploads
              </div>
              <div className="float-chip chip-b">
                <BarChart3 size={14} color="#f97316" /> Profiled in &lt;1ms
              </div>
              <div className="float-chip chip-c">
                <FileSpreadsheet size={14} color="#fbbf24" /> 50k rows in RAM
              </div>
            </div>
          </div>
        </section>

        {/* Stats Strip */}
        <section className="stats-strip">
          <div className="container stats-grid">
            <div className="stat-card">
              <span className="stat-value">50,000</span>
              <span className="stat-label">Max Local Rows</span>
              <span className="stat-desc">Parsed directly in browser memory</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">0 ms</span>
              <span className="stat-label">Cloud Latency</span>
              <span className="stat-desc">Zero network hops required</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">100%</span>
              <span className="stat-label">Privacy Guaranteed</span>
              <span className="stat-desc">Inspectable via DevTools Network tab</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">9+</span>
              <span className="stat-label">Local Analytics Tools</span>
              <span className="stat-desc">From SQL querying to quality scores</span>
            </div>
          </div>
        </section>

        {/* Interactive Preview Widget */}
        <section className="section">
          <div className="container">
            <InteractiveDemoWidget />
          </div>
        </section>

        {/* Core Features Showcase with Custom SVGs */}
        <section className="section features" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">ENGINEERED FOR DATA PROFESSIONALS</span>
              <h2>Real tools for real files. No fluff.</h2>
              <p>Everything you need to inspect, sanitize and explore CSV files before feeding them into models or reports.</p>
            </div>

            <div className="grid grid-cols-3">
              {/* Feature 1: Profiling */}
              <article className="feature-card-rich">
                <div className="feature-card-visual">
                  <Image
                    src="/images/feature-profiling.svg"
                    alt="Automated column profiling illustration"
                    width={400}
                    height={260}
                  />
                </div>
                <div className="feature-card-content">
                  <h3>Automated Profiling</h3>
                  <p>Infers types, detects null percentages, counts distinct values, and generates an honest data quality health score.</p>
                  <ul className="feature-bullets">
                    <li><CheckCircle2 size={13} color="#f97316" /> Type inference (Number, Date, Text)</li>
                    <li><CheckCircle2 size={13} color="#f97316" /> Transparent heuristic quality formula</li>
                    <li><CheckCircle2 size={13} color="#f97316" /> Numerical min, max, and mean summaries</li>
                  </ul>
                </div>
              </article>

              {/* Feature 2: Smart Cleaning */}
              <article className="feature-card-rich">
                <div className="feature-card-visual">
                  <Image
                    src="/images/feature-cleaning.svg"
                    alt="Smart data cleaning illustration"
                    width={400}
                    height={260}
                  />
                </div>
                <div className="feature-card-content">
                  <h3>Zero-Loss Cleaning</h3>
                  <p>Apply deterministic transformations with live previews. Never lose track of what was modified or dropped.</p>
                  <ul className="feature-bullets">
                    <li><CheckCircle2 size={13} color="#f97316" /> Trim leading and trailing whitespace</li>
                    <li><CheckCircle2 size={13} color="#f97316" /> Exact row deduplication via tuple hashing</li>
                    <li><CheckCircle2 size={13} color="#f97316" /> Missing-cell imputation or filtering</li>
                  </ul>
                </div>
              </article>

              {/* Feature 3: Privacy */}
              <article className="feature-card-rich">
                <div className="feature-card-visual">
                  <Image
                    src="/images/feature-privacy.svg"
                    alt="Browser security sandbox illustration"
                    width={400}
                    height={260}
                  />
                </div>
                <div className="feature-card-content">
                  <h3>True Client-Side Isolation</h3>
                  <p>Your confidential data never hits an external cloud server. The entire computation runs in your sandbox.</p>
                  <ul className="feature-bullets">
                    <li><CheckCircle2 size={13} color="#f97316" /> Zero server uploads or cloud trackers</li>
                    <li><CheckCircle2 size={13} color="#f97316" /> Compliant with strict data residency rules</li>
                    <li><CheckCircle2 size={13} color="#f97316" /> Instant verification in DevTools</li>
                  </ul>
                </div>
              </article>

              {/* Feature 4: Charts */}
              <article className="feature-card-rich">
                <div className="feature-card-visual">
                  <Image
                    src="/images/feature-charts.svg"
                    alt="Interactive distribution charts illustration"
                    width={400}
                    height={260}
                  />
                </div>
                <div className="feature-card-content">
                  <h3>Frequency &amp; Histograms</h3>
                  <p>Generate interactive distribution histograms for any column with automatic binning and category sorting.</p>
                  <ul className="feature-bullets">
                    <li><CheckCircle2 size={13} color="#f97316" /> Dynamic binning for continuous numbers</li>
                    <li><CheckCircle2 size={13} color="#f97316" /> Top category breakdowns for strings</li>
                    <li><CheckCircle2 size={13} color="#f97316" /> High-contrast responsive graphics</li>
                  </ul>
                </div>
              </article>

              {/* Feature 5: SQL Workbench */}
              <article className="feature-card-rich">
                <div className="feature-card-visual">
                  <Image
                    src="/images/feature-sql.svg"
                    alt="SQL query workbench illustration"
                    width={400}
                    height={260}
                  />
                </div>
                <div className="feature-card-content">
                  <h3>In-Memory SQL Workbench</h3>
                  <p>Run read-only SQL queries to group, filter, and inspect your dataset with sub-millisecond execution.</p>
                  <ul className="feature-bullets">
                    <li><CheckCircle2 size={13} color="#f97316" /> SELECT column, COUNT(*) GROUP BY</li>
                    <li><CheckCircle2 size={13} color="#f97316" /> Safe bounded execution sandbox</li>
                    <li><CheckCircle2 size={13} color="#f97316" /> Instant tabular result rendering</li>
                  </ul>
                </div>
              </article>

              {/* Feature 6: Export */}
              <article className="feature-card-rich">
                <div className="feature-card-visual">
                  <Image
                    src="/images/feature-export.svg"
                    alt="Export center illustration"
                    width={400}
                    height={260}
                  />
                </div>
                <div className="feature-card-content">
                  <h3>Standardized Export Center</h3>
                  <p>Export your cleaned CSV alongside a comprehensive JSON data quality audit report for downstream pipelines.</p>
                  <ul className="feature-bullets">
                    <li><CheckCircle2 size={13} color="#f97316" /> Formula injection escaping protection</li>
                    <li><CheckCircle2 size={13} color="#f97316" /> JSON quality audit with full statistics</li>
                    <li><CheckCircle2 size={13} color="#f97316" /> RFC 4180 standard compliant output</li>
                  </ul>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* Industries We Serve */}
        <section className="section section-tint">
          <div className="container">
            <div className="section-heading-row">
              <div className="section-heading">
                <span className="eyebrow">INDUSTRIES WE SERVE</span>
                <h2>Solutions shaped for your sector</h2>
                <p>The same privacy-first workflow, applied to the questions your industry actually asks of its data.</p>
              </div>
              <Link href="/solutions" className="button button-outline" style={{ color: "var(--color-text)", borderColor: "var(--color-border-hover)" }}>
                View All Industries <ArrowRight size={15} />
              </Link>
            </div>

            <div className="industry-grid">
              {INDUSTRIES.map((ind) => (
                <article key={ind.title} className="industry-card">
                  <div className="industry-media">
                    <Image src={ind.image} alt={ind.title} fill sizes="(max-width: 700px) 100vw, 300px" />
                    <span className={`icon-tile ${ind.tile}`}>
                      <ind.icon size={20} />
                    </span>
                  </div>
                  <div className="industry-body">
                    <h3>{ind.title}</h3>
                    <p>{ind.text}</p>
                    <Link href="/solutions" className="industry-link">
                      Explore <ArrowRight size={14} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Pipeline */}
        <section className="section">
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">SIMPLE 4-STEP WORKFLOW</span>
              <h2>From messy CSV to clean insights.</h2>
              <p>Experience an intuitive workflow designed for speed, safety, and transparency.</p>
            </div>

            <div className="workflow-grid">
              {[
                {
                  step: "01",
                  title: "Load Dataset",
                  desc: "Drag and drop any CSV up to 10MB or choose from built-in sample datasets.",
                  icon: FileSpreadsheet,
                  tile: "tile-orange",
                },
                {
                  step: "02",
                  title: "Inspect & Profile",
                  desc: "Review automated column type inference, missing value rates, and quality score.",
                  icon: BarChart3,
                  tile: "tile-sky",
                },
                {
                  step: "03",
                  title: "Clean & Query",
                  desc: "Trim spaces, drop duplicates, fill missing cells, or run SQL GROUP BY statements.",
                  icon: Scissors,
                  tile: "tile-emerald",
                },
                {
                  step: "04",
                  title: "Export & Share",
                  desc: "Download RFC 4180 escaped CSV files and verifiable JSON quality reports.",
                  icon: Download,
                  tile: "tile-violet",
                },
              ].map((s) => (
                <div key={s.step} className="workflow-card">
                  <span className="workflow-step">{s.step}</span>
                  <span className={`icon-tile ${s.tile}`} style={{ marginBottom: 16 }}>
                    <s.icon size={20} />
                  </span>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Real-world data work showcase */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-heading-row">
              <div className="section-heading">
                <span className="eyebrow">WHERE THIS WORK FITS</span>
                <h2>Built for real datasets, in real sectors</h2>
                <p>Example workflows the studio is designed to support — described as starting points, not promised outcomes.</p>
              </div>
              <Link href="/platform" className="button button-outline" style={{ color: "var(--color-text)", borderColor: "var(--color-border-hover)" }}>
                See the Platform <ArrowRight size={15} />
              </Link>
            </div>

            <div className="showcase-grid">
              {SHOWCASES.map((s) => (
                <article key={s.title} className="showcase-card">
                  <Image src={s.image} alt={s.title} fill sizes="(max-width: 800px) 100vw, 33vw" />
                  <div className="showcase-body">
                    <span className="showcase-tag">{s.tag}</span>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Section */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">WHY BROWSER-LOCAL?</span>
              <h2>How FINESE DATA compares</h2>
              <p>Compare our client-side architecture against traditional cloud tools and heavy desktop software.</p>
            </div>

            <div className="comparison-table-wrap">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Capability</th>
                    <th style={{ color: "#f97316" }}>FINESE DATA</th>
                    <th>Cloud Analytics Platforms</th>
                    <th>Spreadsheets / Heavy BI</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><b>Data Privacy</b></td>
                    <td className="highlight">100% Local (Never leaves device)</td>
                    <td>Uploaded to third-party cloud</td>
                    <td>Local or shared drive</td>
                  </tr>
                  <tr>
                    <td><b>Account / Signup</b></td>
                    <td className="highlight">None required</td>
                    <td>Mandatory registration &amp; API keys</td>
                    <td>Software license required</td>
                  </tr>
                  <tr>
                    <td><b>Execution Latency</b></td>
                    <td className="highlight">&lt; 1ms (Instant browser RAM)</td>
                    <td>Variable network / server queue</td>
                    <td>Fast, but heavy RAM footprint</td>
                  </tr>
                  <tr>
                    <td><b>Cost</b></td>
                    <td className="highlight">Free &amp; Open Starter</td>
                    <td>Usage-based billing / subscriptions</td>
                    <td>Hefty perpetual licenses</td>
                  </tr>
                  <tr>
                    <td><b>Audit Trail</b></td>
                    <td className="highlight">Verifiable JSON Quality Report</td>
                    <td>Proprietary dashboard view</td>
                    <td>Manual notes required</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Call to Action Banner */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="cta-band">
              <span className="eyebrow">START EXPLORING IN SECONDS</span>
              <h2>Ready to inspect and clean your data privately?</h2>
              <p>No account setup, no API credentials, no server uploads. Your dataset stays entirely in your browser.</p>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
                <Link href="/studio" className="button button-primary">
                  Open FINESE Studio <ArrowRight size={16} />
                </Link>
                <Link href="/studio?sample=sales" className="button button-outline">
                  <Play size={14} /> Load Sample Sales CSV
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export function MarketingPage({
  title,
  eyebrow,
  intro,
  sections,
  heroImage,
  heroImageAlt,
  heroChip,
  gallery,
}: {
  title: string;
  eyebrow: string;
  intro: string;
  sections: { title: string; text: string; bullets?: string[] }[];
  heroImage?: string;
  heroImageAlt?: string;
  heroChip?: string;
  gallery?: { src: string; title: string; text: string; tag: string }[];
}) {
  return (
    <div className="marketing">
      <Navbar />
      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">{eyebrow}</span>
              <h1>{title}</h1>
              <p className="hero-lede">{intro}</p>
              <div className="hero-actions">
                <Link href="/studio" className="button button-primary">
                  Open FINESE Studio <ArrowRight size={16} />
                </Link>
                <Link href="/contact" className="button button-outline">
                  Talk to our team
                </Link>
              </div>
              <div className="hero-mini-stats">
                <div>
                  <strong>100%</strong>
                  <span>Browser-local analysis</span>
                </div>
                <div>
                  <strong>&lt;1ms</strong>
                  <span>Local compute</span>
                </div>
                <div>
                  <strong>0</strong>
                  <span>Accounts required</span>
                </div>
              </div>
            </div>

            {heroImage && (
              <div className="hero-media">
                <div className="hero-visual-glow" aria-hidden="true" />
                <div className="image-block">
                  <Image
                    src={heroImage}
                    alt={heroImageAlt ?? title}
                    width={1100}
                    height={720}
                    priority
                  />
                </div>
                <div className="float-chip chip-orange chip-a">
                  <ShieldCheck size={14} /> {heroChip ?? "Nothing leaves your device"}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="card-grid">
              {sections.map((s, idx) => (
                <article
                  key={s.title}
                  className="card"
                  style={{
                    borderTop: `3px solid ${ACCENT_HEX[idx % ACCENT_HEX.length]}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <span className={`icon-tile sm ${TILE_CLASSES[idx % TILE_CLASSES.length]}`}>
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <h3 style={{ margin: 0, fontSize: "1.15rem" }}>{s.title}</h3>
                  </div>
                  <p style={{ flex: 1, margin: 0 }}>{s.text}</p>
                  {s.bullets && (
                    <ul style={{ marginTop: 14, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                      {s.bullets.map((b) => (
                        <li key={b} style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                          <CheckCircle2 size={13} color="#f97316" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        {gallery && gallery.length > 0 && (
          <section className="section section-tint" style={{ paddingTop: "var(--space-12)" }}>
            <div className="container">
              <div className="section-heading-row">
                <div className="section-heading">
                  <span className="eyebrow">A CLOSER LOOK</span>
                  <h2>Context for the work</h2>
                  <p>Visual references for the environments, tools and teams this page is about.</p>
                </div>
              </div>
              <div className="showcase-grid">
                {gallery.map((g) => (
                  <article key={g.title} className="showcase-card">
                    <Image src={g.src} alt={g.title} fill sizes="(max-width: 800px) 100vw, 33vw" />
                    <div className="showcase-body">
                      <span className="showcase-tag">{g.tag}</span>
                      <h3>{g.title}</h3>
                      <p>{g.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Bottom CTA for marketing pages */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="cta-band">
              <span className="eyebrow">NO SIGNUP NEEDED</span>
              <h2>Try FINESE Studio with your local dataset</h2>
              <p>Experience fast, privacy-preserving browser analytics without signing up.</p>
              <Link href="/studio" className="button button-primary">
                Launch FINESE Studio <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
