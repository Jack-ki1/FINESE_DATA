import { StudioClient } from "@/components/studio";
export const metadata = { title: "Studio workspace", description: "Explore and analyze data in your browser.", robots: { index: false, follow: false } };
export default function StudioHome() { return <StudioClient initialTool="overview" />; }
