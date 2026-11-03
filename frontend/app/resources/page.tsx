import { MarketingPage } from "@/components/landing";
export const metadata = { title: "Resources", description: "Practical guides to data analytics, cleaning, visualization and AI." };
export default function ResourcesPage() {
  return (
    <MarketingPage
      eyebrow="RESOURCE LIBRARY"
      title="Learn. Build. Grow."
      intro="Straightforward guides to help you build a strong data practice. The guides below are starter summaries; replace them with reviewed long-form material and real publication dates as the library grows."
      heroImage="/images/industries/education-vibrant.jpg"
      heroImageAlt="Learners studying together with laptops and books"
      heroChip="Guides, not gatekeeping"
      gallery={[
        { src: "/images/showcase/collaborative-team.jpg", tag: "Practice", title: "Build the habit", text: "Row counts, missingness, type validation, duplicates and outliers — before any model sees the file." },
        { src: "/images/showcase/tech-globe.jpg", tag: "Visualization", title: "Charts that explain", text: "Match the chart to the question, label units and comparisons, and offer accessible text alternatives." },
        { src: "/images/showcase/abstract-fluid.jpg", tag: "AI", title: "Start from the workflow", text: "Begin with a real problem, assess data sensitivity, define acceptable error and keep humans accountable." },
      ]}
      sections={[
        { title: "Data cleaning checklist", text: "Start with row and column counts, understand missingness, validate types, inspect duplicates, review outliers and preserve an unchanged source copy.", bullets: ["Define missing-value rules", "Validate transformations", "Record what changed"] },
        { title: "Machine learning explained", text: "A model learns a pattern from examples; its quality must be assessed against a meaningful baseline using a split that prevents leakage.", bullets: ["Choose the target first", "Avoid leakage", "Read more than accuracy"] },
        { title: "The power of data visualization", text: "Choose a chart for the question, label units and comparisons, avoid clutter and include text summaries for people who cannot interpret the graphic.", bullets: ["Match chart to task", "Show scales and filters", "Offer accessible alternatives"] },
        { title: "AI in business", text: "Begin with a real workflow problem, assess data sensitivity, define acceptable error and keep a person responsible for consequential decisions.", bullets: ["Make privacy explicit", "Evaluate failure modes", "Monitor cost and quality"] },
        { title: "What is MCP?", text: "Model Context Protocol is an open protocol that standardizes ways an AI application can connect to external tools and data sources. Connections still need least-privilege access controls.", bullets: ["Review tool permissions", "Minimize exposed data", "Log and audit calls"] },
        { title: "Ask better questions of data", text: "Turn broad curiosity into a measurable question by naming the entity, time window, metric, comparison group and limitations.", bullets: ["Define the unit of analysis", "Make time windows explicit", "Separate correlation from cause"] }
      ]}
    />
  );
}
