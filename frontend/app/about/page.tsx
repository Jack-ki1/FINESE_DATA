import { MarketingPage } from "@/components/landing";
export const metadata = { title: "About", description: "FINESE DATA's purpose and product principles." };
export default function AboutPage() {
  return (
    <MarketingPage
      eyebrow="ABOUT FINESE DATA"
      title="Insight. Intelligence. Impact."
      intro="FINESE DATA is being shaped around a simple idea: useful data products should help people understand not only what a result says, but how it was produced and where its limits are. The platform is designed as a practical foundation that can grow with the needs of learners, analysts, teams and organizations."
      heroImage="/images/showcase/collaborative-team.jpg"
      heroImageAlt="A team collaborating around laptops in a bright workspace"
      heroChip="Built in the open"
      gallery={[
        { src: "/images/showcase/abstract-fluid.jpg", tag: "Principles", title: "Clarity over magic", text: "Metrics come with definitions, charts come with fields, and models come with evaluations." },
        { src: "/images/showcase/digital-globe.jpg", tag: "Reach", title: "Grown with real needs", text: "Designed to scale from individual learners to teams and organizations, in stages." },
        { src: "/images/showcase/cyber-matrix.jpg", tag: "Craft", title: "Documented decisions", text: "Migration choices, capability limits and known gaps stay written down and testable." },
      ]}
      sections={[
        { title: "Make the work understandable", text: "A metric should have a definition. A chart should show its fields and aggregation. A model should be evaluated, not just celebrated." },
        { title: "Start with user control", text: "Simple analysis should not require an AI key or immediate account creation. Browser-local workflows help users choose when data can leave their device." },
        { title: "Build in the open", text: "The legacy Flask analysis modules are preserved while the new web interface is built in stages. Migration decisions and capability limits should be documented and testable." },
        { title: "Use AI responsibly", text: "AI can help write, explain and explore, but numerical conclusions must come from verified computation and consequential decisions remain with people." },
        { title: "Design for real constraints", text: "Deployment choices should reflect workload, privacy, cost and operational realities — not a promise that every feature can run for free on serverless hosting." },
        { title: "Make room to learn", text: "The product should help beginners grow while remaining useful to people with deeper analytical skills and more demanding workflows." }
      ]}
    />
  );
}
