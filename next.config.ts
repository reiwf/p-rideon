import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Emit a minimal self-contained server (.next/standalone) for the Docker image.
  output: "standalone",
};

// Makes the Cloudflare bindings (the MEDIA R2 bucket) reachable from `next dev`
// through wrangler's local simulator; a no-op for the production build.
initOpenNextCloudflareForDev();

export default nextConfig;
