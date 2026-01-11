import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Externalize packages that use native code or have bundling issues
  serverExternalPackages: ['potrace', 'sharp'],
};

export default nextConfig;
