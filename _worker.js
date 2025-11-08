// _worker.js
import { createRequestHandler } from '@cloudflare/next-on-pages'

export default {
  async fetch(request, env, ctx) {
    return createRequestHandler({
      buildOutputDir: './.next',
      processBuildManifest: true,
    })(request, env, ctx)
  },
}
