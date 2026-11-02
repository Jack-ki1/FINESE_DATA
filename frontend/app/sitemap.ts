import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  // Replace the placeholder domain after the production domain is confirmed.
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://finese-data.example";
  return ["", "/platform", "/solutions", "/services", "/resources", "/about", "/contact", "/privacy", "/terms", "/accessibility"].map((path) => ({ url: `${base}${path}`, changeFrequency: "monthly", priority: path === "" ? 1 : 0.6 }));
}
