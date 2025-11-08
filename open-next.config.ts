import type { OpenNextConfig } from "@opennextjs/cloudflare";

const config: OpenNextConfig = {
  default: {
    includeFiles: ["**/*"],
    enableCacheInterception: false
  }
};

export default config;
