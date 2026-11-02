import { notFound } from "next/navigation";
import { StudioClient, StudioTool } from "@/components/studio";

const tools: StudioTool[] = ["data", "clean", "charts", "sql", "assistant", "ml", "experiments", "export", "settings", "help"];
export async function generateStaticParams() { return tools.map((tool) => ({ tool })); }
export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  return { title: `${tool.replace(/-/g, " ").replace(/^./, (s) => s.toUpperCase())} · Studio`, robots: { index: false, follow: false } };
}
export default async function StudioToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  if (!tools.includes(tool as StudioTool)) notFound();
  return <StudioClient initialTool={tool as StudioTool} />;
}
