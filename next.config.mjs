/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  distDir: "out",
  
  // Performance optimizations
  swcMinify: true,
  reactStrictMode: true,
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
  },
};

export default nextConfig;
