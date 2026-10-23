import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// Wires the local `next dev` server up to Cloudflare bindings (R2, Durable
// Objects, secrets) via a local platform proxy, so getCloudflareContext()
// works during `next dev` instead of only inside `wrangler dev`/production.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
