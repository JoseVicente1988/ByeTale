import type { NextConfig } from "next";

/**
 * ByeTale Community web configuration.
 *
 * Security headers are centralized here so every route inherits the same
 * baseline. More restrictive CSP directives will be added when Twitch embeds
 * and Neon Auth are connected to their final production domains.
 */
const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
        ]
      }
    ];
  }
};

export default nextConfig;
