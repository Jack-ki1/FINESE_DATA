import { MarketingPage } from "@/components/landing";
export const metadata = { title: "Accessibility", description: "Accessibility principles and known gaps for FINESE DATA." };
export default function AccessibilityPage() { return <MarketingPage eyebrow="ACCESSIBILITY" title="The experience should work for more people." intro="The starter aims to support keyboard navigation, semantic controls, responsive layouts, visible focus, reduced motion preferences and readable data alternatives. This is a design commitment, not an independent conformance certification." sections={[
  { title: "Keyboard support", text: "Navigation and workspace actions are built using links, buttons, labels and form controls. Continue testing tab order, focus visibility, dialogs, drag alternatives and keyboard-only workflows."},
  { title: "Readable interfaces", text: "The design uses responsive text, clear content hierarchy, contrast-aware surfaces and visible labels. Validate all final color pairs against applicable contrast criteria."},
  { title: "Charts and tables", text: "Charts should always have a usable data table or text summary. The starter chart is paired with selected field context; richer chart components need accessibility review."},
  { title: "Motion and responsiveness", text: "The stylesheet respects prefers-reduced-motion and includes layouts for narrow screens. Test with real devices, zoom, screen readers and slow networks."},
  { title: "Report an issue", text: "Before launch, configure a real contact channel and publish the date and scope of the latest manual accessibility audit."}
]} />; }
