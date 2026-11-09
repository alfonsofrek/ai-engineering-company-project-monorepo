import type { NextConfig } from "next";

const apiOrigin = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    // Same-origin telemetry endpoint: sendBeacon works without CORS.
    return [{ source: "/api/telemetry/:path*", destination: `${apiOrigin}/telemetry/:path*` }];
  },
  experimental: {
    // The corporate site is a single landing page with a small stylesheet (~6 KB)
    // and mostly first-time visitors: inlining the CSS removes the only
    // render-blocking request left after self-hosting the fonts.
    inlineCss: true,
  },
};

export default nextConfig;
