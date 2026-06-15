import type { NextConfig } from "next";
import { execSync } from "child_process";

const getBuildId = () => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "dev";
  }
};

const nextConfig: NextConfig = {
  output: "standalone",
  generateBuildId: getBuildId,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
