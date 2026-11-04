import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Roda dentro do webview do PhizChat (miniapp). Fora de crawler e índice.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
      // Admin e API nunca ficam em cache compartilhado.
      // O web-view do miniapp abre /api/strava; o admin nunca pode ser emoldurado.
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }, { key: "X-Frame-Options", value: "DENY" }, { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'" }] },
      { source: "/api/admin/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      { source: "/api/mini/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
  images: { unoptimized: true },
  // Fontes e logo da imagem de convite (lidas com fs em /api/convite).
  outputFileTracingIncludes: { "/api/convite/[codigo]": ["./assets-og/**"], "/api/arte/**": ["./assets-og/**"], "/api/strava/**": ["./assets-og/**"], "/api/marca/**": ["./assets-og/**"], "/api/cron/**": ["./assets-og/**"], "/api/mini/**": ["./assets-og/**"] },
};

export default nextConfig;
