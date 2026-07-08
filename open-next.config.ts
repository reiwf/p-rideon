import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default {
  ...defineCloudflareConfig(),
  // OpenNext's bundler can't consume Turbopack server chunks yet — build with webpack.
  buildCommand: "npx next build --webpack",
};
