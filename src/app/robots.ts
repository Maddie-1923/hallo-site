import type { MetadataRoute } from "next";

// Everything public is open to search engines. The signed-in app and the
// server's own routes are kept out; pages that only make sense signed in
// (Library, Settings, Search…) stay crawlable but say noindex themselves,
// since a crawler that's barred from a page never sees its noindex.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/app", "/api/", "/auth/"] },
    sitemap: "https://kodigo.pro/sitemap.xml",
  };
}
