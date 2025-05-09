# Next.js Optimization for Slow Filesystem

This document provides solutions for the "Slow filesystem detected" warning in Next.js when running in environments with slower filesystem performance, such as Codespaces.

## The Problem

When running Next.js in certain environments, you might encounter this warning:

```
Slow filesystem detected. If /workspaces/Algoace/.next is a network drive, consider moving it to a local folder. If you have an antivirus enabled, consider excluding your project directory.
```

This warning indicates that Next.js has detected slow filesystem operations, which can significantly impact development and build performance.

## Solutions

We've implemented several optimizations to address this issue:

### 1. Optimized Next.js Configuration

The `next.config.ts` file has been updated with performance optimizations:

- Configurable build directory location (RAM disk support)
- Optimized page caching with `onDemandEntries`
- CSS optimization

### 2. Environment Variables

A `.env.local` file has been created with performance-related settings:

- Disabled telemetry
- Increased Node.js memory limit
- Disabled source maps in production
- Enabled SWC compiler

### 3. Optimized npm Scripts

Several npm scripts have been added to package.json:

- `npm run dev:clean` - Cleans the Next.js cache before starting
- `npm run dev:fast` - Uses additional performance optimizations
- `npm run dev:optimized` - Combines all optimizations
- `npm run dev:ramdisk` - Uses a RAM disk for the build directory
- `npm run build:clean` - Cleans cache before building
- `npm run build:optimized` - Optimized build process
- `npm run build:ramdisk` - Uses a RAM disk for the build process
- `npm run cache:clear` - Utility to manually clear the cache

### 4. Helper Scripts

Two helper scripts are provided:

- `start-with-ramdisk.sh` - Starts Next.js with RAM disk for build directory
- `optimize-nextjs.sh` - Applies all optimizations to the project

## Recommended Usage

For the best performance in environments with slow filesystem access:

1. Use the RAM disk option:
   ```
   npm run dev:ramdisk
   ```

2. Or use the helper script:
   ```
   ./start-with-ramdisk.sh
   ```

These options will store the Next.js build files in memory rather than on the filesystem, which significantly improves performance.

## Troubleshooting

If you still encounter performance issues:

1. Clear the Next.js cache:
   ```
   npm run cache:clear
   ```

2. Restart the development server with the optimized settings:
   ```
   npm run dev:optimized
   ```

3. If backend API connections are failing, start the backend server separately:
   ```
   cd /workspaces/Algoace && python -m backend.app