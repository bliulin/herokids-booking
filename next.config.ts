import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres", "node-cron"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "herokids.ro",
      },
    ],
  },
};

export default nextConfig;
