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
