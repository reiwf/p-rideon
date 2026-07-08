import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Emit a minimal self-contained server (.next/standalone) for the Docker image.
  output: "standalone",
};

export default nextConfig;
