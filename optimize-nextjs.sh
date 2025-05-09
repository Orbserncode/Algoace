#!/bin/bash

# Script to optimize Next.js for slow filesystem environments
# This addresses the "Slow filesystem detected" warning

echo "Optimizing Next.js for slow filesystem..."

# Stop any running Next.js processes
echo "Stopping any running Next.js processes..."
pkill -f "next" || true

# Clean up existing .next directory
echo "Cleaning up existing .next directory..."
rm -rf /workspaces/Algoace/.next

# Update next.config.ts to use memory-optimized settings
echo "Updating Next.js configuration..."
cat > /workspaces/Algoace/next.config.ts << 'EOL'
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // Optimize for performance in environments with slower filesystems
  distDir: '.next',
  swcMinify: true,
  onDemandEntries: {
    // Keep pages in memory for longer to reduce rebuilds
    maxInactiveAge: 60 * 60 * 1000, // 1 hour
    pagesBufferLength: 10,
  },
  experimental: {
    // Enable memory optimizations
    optimizeCss: true,
    optimizeServerReact: true,
    turbotrace: {
      memoryLimit: 4000,
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Add API proxy configuration
  async rewrites() {
    return [
      {
        source: '/api/datasets',
        destination: 'http://localhost:8000/datasets/',
      },
      {
        source: '/api/datasets/:path*',
        destination: 'http://localhost:8000/datasets/:path*',
      },
      {
        source: '/api/recommendations/:path*',
        destination: 'http://localhost:8000/recommendations/:path*',
      },
      {
        source: '/api/monitoring/:path*',
        destination: 'http://localhost:8000/monitoring/:path*',
      },
      {
        source: '/api/agents',
        destination: 'http://localhost:8000/agents/',
      },
      {
        source: '/api/agents/:path*',
        destination: 'http://localhost:8000/agents/:path*',
      },
      {
        source: '/api/strategies',
        destination: 'http://localhost:8000/strategies/',
      },
      {
        source: '/api/strategies/:path*',
        destination: 'http://localhost:8000/strategies/:path*',
      },
      {
        source: '/api/file-agents',
        destination: 'http://localhost:8000/file-agents',
      },
      {
        source: '/api/file-agents/:path*',
        destination: 'http://localhost:8000/file-agents/:path*',
      },
      {
        source: '/api/file-strategies',
        destination: 'http://localhost:8000/file-strategies',
      },
      {
        source: '/api/file-strategies/:path*',
        destination: 'http://localhost:8000/file-strategies/:path*',
      },
      {
        source: '/api/backtesting/:path*',
        destination: 'http://localhost:8000/api/backtesting/:path*',
      },
    ];
  },
  // Add environment variables for the frontend
  env: {
    BACKEND_URL: 'http://localhost:8000',
  },
};

export default nextConfig;
EOL

# Create optimized .env.local file
echo "Creating optimized environment variables..."
cat > /workspaces/Algoace/.env.local << 'EOL'
# Next.js Performance Optimizations
NEXT_TELEMETRY_DISABLED=1
# Increase memory limit for Node.js
NODE_OPTIONS=--max_old_space_size=4096
# Disable source maps in production to improve build performance
GENERATE_SOURCEMAP=false
# Enable SWC compiler for faster builds
NEXT_SWC_MINIFY=true
# Optimize for slow filesystem
NEXT_OPTIMIZE_FONTS=true
NEXT_OPTIMIZE_IMAGES=true
NEXT_OPTIMIZE_CSS=true
EOL

# Update package.json scripts
echo "Updating npm scripts..."
npx json -I -f /workspaces/Algoace/package.json -e '
this.scripts["dev:optimized"] = "NODE_OPTIONS=\"--max_old_space_size=4096\" NEXT_TELEMETRY_DISABLED=1 next dev --turbopack -p 9002";
this.scripts["build:optimized"] = "NODE_OPTIONS=\"--max_old_space_size=4096\" NEXT_TELEMETRY_DISABLED=1 next build";
'

echo "Optimization complete!"
echo "To start Next.js with optimized settings, run: npm run dev:optimized"