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

const wsBase = API_BASE.replace(/^http/, "ws");
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(self)",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: ${API_BASE}`,
      `connect-src 'self' ${API_BASE} ${wsBase}`,
      "font-src 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
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
