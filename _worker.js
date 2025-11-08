import { createRequestHandler } from '@cloudflare/next-on-pages'

const worker = {
  async fetch(request, env, ctx) {
    return createRequestHandler({
      buildOutputDir: './.next',
      processBuildManifest: true,
    })(request, env, ctx)
  },
}

export default worker
