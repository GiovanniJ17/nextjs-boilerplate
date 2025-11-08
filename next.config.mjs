/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out', // <-- Cloudflare Pages serve questa cartella
  experimental: {},
};

export default nextConfig;
