import Link from "next/link";
import { ArrowRight, ArrowUpRight, BarChart3, BrainCircuit, Check, CheckCircle2, ChevronRight, CloudUpload, Database, FileSpreadsheet, Fingerprint, Layers3, MessageSquareText, ShieldCheck, Sparkles, Workflow, Zap } from "lucide-react";

const modules = [
  { n:"01", icon:CloudUpload, title:"Upload & connect", desc:"Bring structured files and databases into one governed workspace. Preview schemas before analysis.", color:"orange" },
  { n:"02", icon:Layers3, title:"Clean with confidence", desc:"Understand missingness, standardize data, handle outliers and keep a traceable transformation history.", color:"blue" },
  { n:"03", icon:MessageSquareText, title:"Ask better questions", desc:"Work with a data-aware assistant that can explain the evidence behind its findings.", color:"violet" },
  { n:"04", icon:BrainCircuit, title:"Build useful models", desc:"Prepare features, benchmark algorithms, evaluate performance and keep experiments organized.", color:"green" },
  { n:"05", icon:BarChart3, title:"Explore visually", desc:"Move from column distributions to correlations, pivot-style summaries and clear charts.", color:"pink" },
  { n:"06", icon:FileSpreadsheet, title:"Share the outcome", desc:"Export data, quality reports, experiment summaries and model artifacts for the next step.", color:"gold" },
];
const bars=[34,49,43,60,53,74,65,83,71,92,78,100,86,94,73,88,64,80,70,91];
export default function Home() {
 return <main className="marketing">
  <div className="top-glow" />
  <header className="public-nav wrap">
   <Link href="/" className="brand"><span className="brand-symbol"><i/><i/><i/></span><span>FINESE <b>DATA</b></span></Link>
   <nav className="public-links"><a href="#platform">Platform</a><a href="#workflow">Workflow</a><a href="#trust">Trust</a></nav>
   <div className="nav-cta"><Link href="/login" className="nav-login">Sign in</Link><Link href="/signup" className="btn btn-primary btn-small">Create workspace <ArrowUpRight size={15}/></Link></div>
  </header>

  <section className="hero wrap">
   <div className="hero-copy">
    <div className="eyebrow"><span className="pulse-dot"/> THE DATA INTELLIGENCE WORKSPACE</div>
    <h1>From raw data<br/>to <em>reliable decisions.</em></h1>
    <p className="hero-lede">One thoughtful workspace to explore, prepare, understand, model and transform your data into something valuable.</p>
    <div className="hero-actions"><Link href="/signup" className="btn btn-primary">Start building <ArrowRight size={17}/></Link><a href="#workflow" className="text-link">See how it works <ChevronRight size={16}/></a></div>
    <div className="hero-proof"><div className="avatar-stack"><span>F</span><span>D</span><span>AI</span></div><span>Built for analysts, researchers<br/>and teams that work with data.</span></div>
   </div>
   <div className="hero-visual" aria-label="Illustrative FINESE DATA analytics dashboard">
    <div className="visual-orbit orbit-one"/><div className="visual-orbit orbit-two"/>
    <div className="floating-tag tag-left"><span className="tag-icon orange"><Check size={14}/></span><span><b>Data validated</b><small>Quality checks complete</small></span></div>
    <div className="floating-tag tag-right"><span className="tag-icon blue"><BrainCircuit size={15}/></span><span><b>Model insight</b><small>Experiment tracked</small></span></div>
    <div className="analytics-window">
     <div className="window-top"><div className="window-dots"><i/><i/><i/></div><span>FINESE / WORKSPACE</span><span className="live-label"><i/> SAMPLE</span></div>
     <div className="window-content">
      <div className="window-heading"><div><small>WORKSPACE OVERVIEW</small><h3>Good afternoon, analyst.</h3></div><div className="window-avatar">JD</div></div>
      <div className="mini-kpis"><div><small>ROWS ANALYSED</small><b>24,860</b><em>↑ 12.4%</em></div><div><small>DATASETS</small><b>08</b><em>+2 this week</em></div><div><small>QUALITY INDEX</small><b>94.2<span>%</span></b><em className="positive">Healthy</em></div></div>
      <div className="window-chart"><div className="chart-title"><span>Data activity</span><small>LAST 30 DAYS</small></div><div className="chart-bars">{bars.map((h,i)=><i key={i} style={{height:`${h}%`}} />)}</div><div className="chart-axis"><span>OCT 04</span><span>OCT 14</span><span>OCT 24</span><span>NOV 03</span></div></div>
      <div className="window-bottom"><div><span className="tiny-icon"><Database size={13}/></span><span><b>customer_segments.csv</b><small>12 columns · Updated just now</small></span></div><span className="status-chip">READY</span></div>
     </div>
    </div>
    <div className="visual-caption"><Sparkles size={13}/> A clearer view of your analytical work.</div>
   </div>
  </section>

  <section className="trust-strip wrap" id="trust"><span>ONE CONTINUOUS WORKFLOW</span><div><CheckCircle2 size={16}/> Transparent analysis</div><div><ShieldCheck size={16}/> Workspace isolation</div><div><Workflow size={16}/> Reproducible work</div><div><Zap size={16}/> Built for momentum</div></section>

  <section className="section wrap" id="platform">
   <div className="section-heading"><div><div className="eyebrow">THE WORKSPACE</div><h2>Everything you need.<br/><em>One connected flow.</em></h2></div><p>Move through the real stages of analytical work without switching between disconnected tools or losing the story behind your data.</p></div>
   <div className="module-grid">{modules.map((m)=><article className="module-card" key={m.n}><div className="module-top"><span className="module-number">{m.n}</span><span className={`module-icon ${m.color}`}><m.icon size={19}/></span></div><h3>{m.title}</h3><p>{m.desc}</p><span className="module-line"/></article>)}</div>
  </section>

  <section className="workflow-section" id="workflow"><div className="wrap workflow-inner"><div className="workflow-copy"><div className="eyebrow">DESIGNED AROUND YOUR WORK</div><h2>Less tool switching.<br/><em>More meaningful work.</em></h2><p>Every action builds on the last. Upload a dataset, understand its quality, prepare it carefully, explore its patterns and turn the strongest findings into a model or report.</p><div className="workflow-steps"><div><span>01</span><b>Understand the data</b><small>Inspect structure, completeness and distributions.</small></div><div><span>02</span><b>Prepare with purpose</b><small>Apply controlled transformations and preserve versions.</small></div><div><span>03</span><b>Turn evidence into action</b><small>Explore, model, evaluate and share the results.</small></div></div><Link href="/signup" className="text-link">Build your first workspace <ArrowRight size={16}/></Link></div>
   <div className="workflow-art"><div className="flow-card flow-main"><span className="flow-icon orange"><Database size={18}/></span><b>customer_data.csv</b><small>Source dataset · 24,860 rows</small><div className="flow-progress"><i style={{width:"94%"}}/></div><span className="flow-note">94% completeness</span></div><div className="flow-connector"><i/><i/><i/></div><div className="flow-card flow-two"><span className="flow-icon blue"><Sparkles size={18}/></span><b>Preparation pipeline</b><small>4 transformations recorded</small><div className="flow-tags"><span>Impute</span><span>Normalize</span><span>Validate</span></div></div><div className="flow-connector short"><i/><i/></div><div className="flow-result"><div><span className="flow-icon green"><BrainCircuit size={18}/></span><span><b>Analysis ready</b><small>Explore insights and model outcomes</small></span></div><ArrowUpRight size={18}/></div><div className="art-grid"/></div>
  </div></section>

  <section className="section wrap use-cases"><div className="section-heading"><div><div className="eyebrow">BUILT FOR REAL WORK</div><h2>From first inspection<br/>to <em>finished insight.</em></h2></div><p>Whether you are preparing operational data, exploring research datasets or evaluating predictive models, FINESE DATA keeps the workflow organized.</p></div><div className="usecase-row"><div><span className="usecase-icon"><BarChart3 size={20}/></span><b>Data analytics</b><small>Profiles, summaries, visual exploration and reports.</small></div><div><span className="usecase-icon"><BrainCircuit size={20}/></span><b>Machine learning</b><small>Feature preparation, model evaluation and experiments.</small></div><div><span className="usecase-icon"><MessageSquareText size={20}/></span><b>AI-assisted work</b><small>Dataset-aware explanations with clear data provenance.</small></div><div><span className="usecase-icon"><Database size={20}/></span><b>Data operations</b><small>Versioned cleaning, repeatable exports and traceability.</small></div></div></section>

  <section className="security-band"><div className="wrap security-inner"><div className="security-mark"><Fingerprint size={26}/></div><div><div className="eyebrow">PRIVACY AND CONTROL</div><h2>Your data. Your workspace. <em>Your control.</em></h2><p>Private workspace ownership, authenticated APIs and explicit consent before dataset context is sent to an external AI provider. No silent data sharing.</p></div><Link href="/signup" className="btn btn-outline">Create an account <ArrowUpRight size={16}/></Link></div></section>

  <section className="final-cta wrap"><div className="cta-spark"><Sparkles size={20}/></div><div className="eyebrow">YOUR NEXT DATA PROJECT STARTS HERE</div><h2>Make your next analysis<br/><em>your best one yet.</em></h2><p>Start with a dataset. Leave with a clearer understanding of what it can tell you.</p><Link href="/signup" className="btn btn-primary">Create your free workspace <ArrowRight size={17}/></Link></section>

  <footer className="footer wrap"><Link href="/" className="brand"><span className="brand-symbol"><i/><i/><i/></span><span>FINESE <b>DATA</b></span></Link><span>From raw data to reliable decisions.</span><div><Link href="/login">Sign in</Link><Link href="/signup">Get started</Link><a href="mailto:hello@finesedata.com">Contact</a></div><small>© {new Date().getFullYear()} FINESE DATA. Built for careful, evidence-led data work.</small></footer>
 </main>
}
