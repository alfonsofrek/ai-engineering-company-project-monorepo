import type { NextConfig } from "next";

const authApiOrigin = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/auth/:path*", destination: `${authApiOrigin}/auth/:path*` },
      { source: "/api/users/:path*", destination: `${authApiOrigin}/users/:path*` },
      { source: "/api/profiles/:path*", destination: `${authApiOrigin}/profiles/:path*` },
    ];
  },
};

export default nextConfig;
