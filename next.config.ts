import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false, // Deshabilita mapas de código fuente en producción para proteger el código
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "X-Frame-Options",
          value: "DENY", // Previene ataques de Clickjacking
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff", // Previene ataques de MIME-sniffing
        },
        {
          key: "X-XSS-Protection",
          value: "1; mode=block", // Filtro anti-XSS
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()",
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://*.basemaps.cartocdn.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
            "img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://unpkg.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.cartocdn.com",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join("; "),
        },
      ],
    },
  ],
};

export default nextConfig;
