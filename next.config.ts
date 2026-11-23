import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Server-only libraries that must not be bundled by the compiler.
  serverExternalPackages: ["@react-pdf/renderer", "@libsql/client", "@prisma/adapter-libsql"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      // Everything except report files: never framed.
      { source: "/((?!api/lab-reports/files/|api/share/[^/]+/lab-files/).*)", headers: securityHeaders },
      // Report files open inside our own page viewer (PDF iframe), so only same-origin framing is allowed.
      {
        source: "/api/(lab-reports/files|share/[^/]+/lab-files)/:path*",
        headers: securityHeaders.map((h) => (h.key === "X-Frame-Options" ? { ...h, value: "SAMEORIGIN" } : h)),
      },
    ];
  },
};

export default nextConfig;
