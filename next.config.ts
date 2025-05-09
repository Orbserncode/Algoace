import type {NextConfig} from 'next';

// Use a RAM-based directory for build output to avoid slow filesystem issues
const useRamDisk = process.env.USE_RAMDISK === 'true';
const buildDir = useRamDisk ? '/tmp/nextjs-build' : '.next';

// Create the build directory if using RAM disk
if (useRamDisk) {
  const fs = require('fs');
  if (!fs.existsSync('/tmp/nextjs-build')) {
    fs.mkdirSync('/tmp/nextjs-build', { recursive: true });
  }
}

const nextConfig: NextConfig = {
  /* config options here */
  // Optimize for performance in environments with slower filesystems
  distDir: buildDir, // Use RAM disk or default directory
  onDemandEntries: {
    // Keep pages in memory for longer to reduce rebuilds
    maxInactiveAge: 60 * 60 * 1000, // 1 hour
    pagesBufferLength: 10,
  },
  experimental: {
    // Enable memory optimizations
    optimizeCss: true,
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
