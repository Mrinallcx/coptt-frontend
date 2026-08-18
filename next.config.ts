import type { NextConfig } from "next";

// Same-origin proxy to the Go API on this host. Browser calls /backend/*,
// Next rewrites to 127.0.0.1:8081 — no public API DNS required for staging.
const backendOrigin =
  process.env.COPTT_BACKEND_ORIGIN || "http://127.0.0.1:8081";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${backendOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
