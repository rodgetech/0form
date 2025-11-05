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
      {
        // Apply to all routes that will be framed (change to "/(.*)" if needed)
        source: "/f/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            // Allow any HTTPS ancestor + localhost dev
            value: "frame-ancestors https: http://localhost:3000",
          },
          // Optional: explicitly clear XFO if some middleware sets it
          { key: "X-Frame-Options", value: "ALLOWALL" }, // or just don't send it at all
        ],
      },
    ];
  },
};

export default nextConfig;
