import { MarketingPage } from "@/components/landing";
export const metadata = { title: "Terms", description: "Draft terms of use for the FINESE DATA starter." };
export default function TermsPage() { return <MarketingPage eyebrow="TERMS · DRAFT" title="Use the workspace with care." intro="This development-stage outline is not a substitute for approved legal terms. The site owner must review it before the website is presented as a commercial service." sections={[
  { title: "Current capabilities", text: "This starter provides browser-local demonstration functionality, including CSV parsing, profiling, selected transformations, basic charts, a restricted query subset and downloads. It does not guarantee fitness for a particular purpose or replace validation of analysis."},
  { title: "Data ownership and handling", text: "Users remain responsible for having rights to files they analyze, protecting confidential data, validating results and deciding what to export or share. Local browser storage is not guaranteed permanent."},
  { title: "No unsupported promises", text: "AI provider usage, cloud accounts, full SQL, model training, collaboration, persistent server storage and production security guarantees are not included unless clearly activated and separately documented."},
  { title: "External services", text: "When optional providers are connected, their terms, pricing, quotas, privacy practices and applicable service limits must be reviewed and disclosed."},
  { title: "Owner review required", text: "Add accurate company identity, contact information, governing law, acceptable-use rules, availability language, liability provisions and consumer/commercial terms after legal review."}
]} />; }
