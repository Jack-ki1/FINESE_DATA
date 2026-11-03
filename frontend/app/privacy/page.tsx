import { MarketingPage } from "@/components/landing";
export const metadata = { title: "Privacy", description: "Starter privacy disclosure for FINESE DATA." };
export default function PrivacyPage() {
  return (
    <MarketingPage
      eyebrow="PRIVACY NOTICE · DRAFT"
      title="Your data deserves a clear explanation."
      intro="This is a development-stage disclosure, not legal advice. The site owner must review it against the final code, deployed providers, jurisdiction, and applicable Kenyan and other privacy laws before public launch."
      heroImage="/images/showcase/server-cloud.jpg"
      heroImageAlt="Rows of servers glowing in a dark data centre"
      heroChip="Local by default"
      gallery={[
        { src: "/images/showcase/circuit-tech.jpg", tag: "In the browser", title: "Parsing stays local", text: "CSV parsing, profiling, cleaning, charts and the query subset run on your own device." },
        { src: "/images/showcase/cyber-matrix.jpg", tag: "Optional AI", title: "Only with consent", text: "The separate AI endpoint sends prompts and a minimised profile — never raw rows — when enabled and consented." },
        { src: "/images/showcase/digital-globe.jpg", tag: "Not connected", title: "No accounts or trackers", text: "Authentication, object storage, analytics cookies and multi-user sharing are not connected in this starter." },
      ]}
      sections={[
        { title: "Browser-local analysis", text: "In the starter, CSV parsing, profiling, simple cleaning, chart summaries and the restricted query subset run in the user's browser. The current client may save a dataset and experiment notes to browser local storage. Browser storage can be evicted and is not a backup." },
        { title: "Optional AI compute API", text: "Browser-local Studio analysis does not contact an AI provider. If the separately hosted FastAPI AI endpoint is enabled with a server-side OpenAI key and the request includes explicit consent, it sends the prompt and a minimized dataset profile (such as field names and aggregate quality metrics) to OpenAI. The current endpoint does not send raw rows. Provider-generated text is not a verified computation; confirm important claims against the local profile." },
        { title: "Contact forms", text: "The starter contact form does not post content to a server. It only prepares a mailto message when a verified public contact address is configured. Server-side email, analytics, and CRM handling are not connected." },
        { title: "Cloud accounts and storage", text: "Authentication, cloud projects, object storage, analytics cookies and multi-user sharing are not connected in the current starter. Add a specific notice and retention/access controls before enabling them." },
        { title: "Owner review required", text: "Replace this draft with verified data-controller details, purpose and lawful basis, processors, international transfers, retention, user rights, security contacts and complaint routes before production." }
      ]}
    />
  );
}
