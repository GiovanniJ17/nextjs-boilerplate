/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Usa la build standalone (richiesta da Cloudflare)
  output: 'standalone',

  // ✅ Cloudflare non supporta alcune funzioni server Node.js classiche
  // quindi abilitiamo l'ottimizzazione dei pacchetti
  experimental: {
    optimizePackageImports: ['@cloudflare/next-on-pages'],
  },

  // ✅ Ottimizzazione immagini: Cloudflare le serve già in edge
  images: {
    unoptimized: true,
  },

  // ✅ Rimuove avvisi inutili in fase di build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ Gestione delle variabili pubbliche (utile per Supabase)
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // ✅ Redirect automatico per gestire percorsi non trovati
  async redirects() {
    return [
      {
        source: '/old-path',
        destination: '/',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
