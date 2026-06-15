import type { NextConfig } from "next";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:7001"
).replace(/\/$/, "");

let imageHostname = "localhost";
let imagePort = "7001";

try {
  const apiUrl = new URL(API_BASE);
  imageHostname = apiUrl.hostname;
  imagePort = apiUrl.port || (apiUrl.protocol === "https:" ? "443" : "80");
} catch {
  // keep defaults
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: imageHostname,
        port: imagePort,
        pathname: "/api/images/**",
      },
      {
        protocol: "https",
        hostname: imageHostname,
        port: imagePort,
        pathname: "/api/images/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/images/:path*",
        destination: `${API_BASE}/api/images/:path*`,
      },
      {
        source: "/api/ws",
        destination: `${API_BASE}/api/ws`,
      },
    ];
  },
};

export default nextConfig;
