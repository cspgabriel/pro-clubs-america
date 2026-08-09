import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "eafc24.content.easports.com" }],
  },
};

export default nextConfig;
