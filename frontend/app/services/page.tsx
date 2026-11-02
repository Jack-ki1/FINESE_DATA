import { MarketingPage } from "@/components/landing";
export const metadata = { title: "Services", description: "Data, AI and analytics services from FINESE DATA." };
export default function ServicesPage() { return <MarketingPage eyebrow="SERVICES" title="From questions to practical data work." intro="A clear engagement starts with the decision you need to make, the data available, and how you will know the work helped. These are service areas to discuss, not pre-set pricing packages or claims about past customers." sections={[
  { title: "Data analytics & reporting", text: "Tidy source data, define business measures, explore trends and communicate findings in a form people can use.", bullets: ["Data profiling", "Exploratory analysis", "Reporting specifications"]},
  { title: "Dashboard design", text: "Design dashboards with a coherent information hierarchy, meaningful chart choices and definitions for each metric.", bullets: ["KPI definition", "Chart design", "Dashboard prototypes"]},
  { title: "AI & workflow automation", text: "Identify specific repeatable tasks where automation may help, then add safeguards, human review and cost controls.", bullets: ["Use-case evaluation", "Human approval paths", "Privacy and budget controls"]},
  { title: "Machine learning", text: "Develop a baseline, evaluate data leakage and model quality, and choose deployment options that match your workload and budget.", bullets: ["Baseline comparisons", "Evaluation reports", "Model deployment planning"]},
  { title: "Data foundations", text: "Map how files, systems and teams exchange data, then plan maintainable pipelines and governance practices.", bullets: ["Data-flow mapping", "Quality monitoring", "Storage and access planning"]},
  { title: "Training & mentorship", text: "Support learners and teams through accessible, practical material in analytics, SQL, Python, visualization and ML basics.", bullets: ["Guided workshops", "Project review", "Learning roadmaps"]}
]} />; }
