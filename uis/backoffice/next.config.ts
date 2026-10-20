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
    ];
  },
};

export default nextConfig;
