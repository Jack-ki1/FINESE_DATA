import { MarketingPage } from "@/components/landing";
export const metadata = { title: "Solutions", description: "Practical data intelligence approaches across industries." };
export default function SolutionsPage() {
  return (
    <MarketingPage
      eyebrow="SOLUTIONS"
      title="Make better decisions, in context."
      intro="Different teams ask different questions of their data. FINESE DATA helps frame those questions, choose suitable analysis methods and communicate findings responsibly — without inventing case studies or promised outcomes."
      heroImage="/images/showcase/digital-globe.jpg"
      heroImageAlt="A glowing digital globe of connected data points"
      heroChip="Right method, right context"
      gallery={[
        { src: "/images/industries/finance-vibrant.jpg", tag: "Finance & SMEs", title: "Numbers people can trace", text: "Revenue, cost, cash-flow and budget-versus-actual views with repeatable reporting." },
        { src: "/images/industries/healthcare-vibrant.jpg", tag: "Healthcare", title: "Privacy-led operations", text: "Non-clinical operational measures such as capacity, service volumes and resource usage." },
        { src: "/images/industries/retail-vibrant.jpg", tag: "Retail & logistics", title: "Demand and stock clarity", text: "Sales and stock patterns by product, location and time — starting from source-data quality." },
      ]}
      sections={[
        { title: "Finance & SMEs", text: "Understand sales, margin, cash-flow drivers and operational performance using clear definitions and repeatable reporting.", bullets: ["Revenue and cost trends", "Budget vs actuals", "Scenario assumptions"] },
        { title: "Healthcare operations", text: "Explore non-clinical operational measures such as facility capacity, service volumes and resource usage. Protect sensitive data and follow local requirements.", bullets: ["Operational reporting", "Capacity and resource views", "Privacy-led handling"] },
        { title: "Retail & logistics", text: "Assess demand patterns and inventory visibility by product, location and time — starting with source-data quality.", bullets: ["Sales and stock patterns", "Product-level comparisons", "Operational dashboards"] },
        { title: "Agriculture", text: "Bring production, weather, input and market datasets together to explore patterns. Models need reliable field data and validation before informing decisions.", bullets: ["Yield exploration", "Resource planning", "Seasonal comparisons"] },
        { title: "Education & research", text: "Help learners and research teams build repeatable analysis habits and explain methods as well as results.", bullets: ["Dataset quality checks", "Visual explanations", "Reproducible project notes"] },
        { title: "Data & AI readiness", text: "Define the business question, quality requirements, governance and evaluation approach before committing to an AI or ML project.", bullets: ["Use-case discovery", "Data readiness review", "Measurement plan"] }
      ]}
    />
  );
}
