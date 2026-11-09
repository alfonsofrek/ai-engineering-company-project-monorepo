import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The corporate site is a single landing page with a small stylesheet (~6 KB)
    // and mostly first-time visitors: inlining the CSS removes the only
    // render-blocking request left after self-hosting the fonts.
    inlineCss: true,
  },
};

export default nextConfig;
