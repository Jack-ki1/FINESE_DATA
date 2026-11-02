import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: ["/", "/platform", "/solutions", "/services", "/resources", "/about", "/contact", "/privacy", "/terms", "/accessibility"], disallow: ["/studio"] }] };
}
