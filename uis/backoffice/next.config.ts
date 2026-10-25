import type { NextConfig } from "next";

const apiOrigin = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/suppliers",
        destination: `${apiOrigin}/suppliers`,
      },
      {
        source: "/api/suppliers/:path*",
        destination: `${apiOrigin}/suppliers/:path*`,
      },
      {
        // Incident manager and CSV analysis live under /api/incidents in the API as well.
        source: "/api/incidents",
        destination: `${apiOrigin}/api/incidents`,
      },
      {
        source: "/api/incidents/:path*",
        destination: `${apiOrigin}/api/incidents/:path*`,
      },
      {
        source: "/api/auth/:path*",
        destination: `${apiOrigin}/auth/:path*`,
      },
      {
        source: "/api/users/:path*",
        destination: `${apiOrigin}/users/:path*`,
      },
      {
        source: "/api/profiles/:path*",
        destination: `${apiOrigin}/profiles/:path*`,
      },
    ];
  },
};

export default nextConfig;
