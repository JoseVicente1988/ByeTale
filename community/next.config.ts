import type { NextConfig } from "next";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' https://player.twitch.tv",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.neon.tech https://*.twitch.tv wss://*.twitch.tv",
  "frame-src https://player.twitch.tv https://www.twitch.tv",
  "media-src 'self' https://*.twitch.tv blob:",
  "upgrade-insecure-requests",
].join("; ");

/**
 * ByeTale Community web configuration.
 *
 * Security headers are centralized here so every route inherits the same
 * baseline. The CSP is enabled only for production so framework development
 * tooling remains usable without weakening the deployed site.
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
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          ...(process.env.NODE_ENV === "production"
            ? [
                { key: "Content-Security-Policy", value: contentSecurityPolicy },
                { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
              ]
            : [])
        ]
      }
    ];
  }
};

export default nextConfig;
