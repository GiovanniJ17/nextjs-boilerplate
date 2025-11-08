import { OpenNextConfig } from "@opennextjs/cloudflare";

const config: OpenNextConfig = {
  default: {
    compatibilityDate: "2025-11-08",
    compatibilityFlags: ["nodejs_compat"],
  },
};

export default config;
