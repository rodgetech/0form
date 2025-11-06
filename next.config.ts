// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { ppr: true },
  images: {
    remotePatterns: [
      { hostname: "avatar.vercel.sh" },
      { hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  async headers() {
    return [
      // default: nothing special (implicitly not frameable if no frame-ancestors)
      // OR explicitly deny framing for non-form routes:
      {
        source: "/((?!f/).*)",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
      // allow framing ONLY for public form pages
      {
        source: "/f/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            // MVP: anyone over HTTPS + your dev port
            value: "frame-ancestors https: http://localhost:3000",
          },
          // do NOT set X-Frame-Options; CSP replaces it
        ],
      },
    ];
  },
};

export default nextConfig;
