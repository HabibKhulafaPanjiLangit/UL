import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  
  // Vercel deployment optimizations
  serverExternalPackages: ['@prisma/client', 'prisma'],  // Environment-specific configuration
  webpack: (config, { dev, isServer }) => {
    // Only apply dev-specific config in development
    if (dev && !process.env.VERCEL) {
      config.watchOptions = {
        ignored: ['**/*'], // Ignore all file changes for nodemon handling
      };
    }

    // Optimize for production
    if (!dev) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        prisma: {
          name: 'prisma',
          chunks: 'all',
          test: /[\\/]node_modules[\\/](@prisma|prisma)[\\/]/,
        },
      };
    }

    return config;
  },

  eslint: {
    // Skip ESLint during builds on Vercel
    ignoreDuringBuilds: true,
  },  // Headers for better performance
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
