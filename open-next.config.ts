import type { OpenNextConfig } from "@opennextjs/cloudflare";

const config: OpenNextConfig = {
  default: {
    override: {
      routes: [
        {
          src: "/(.*)",
          dest: "/index.html",
        },
      ],
    },
  },
};

export default config;
