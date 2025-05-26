#!/bin/bash

# Script to start Next.js development server with performance optimizations
# for environments with slow filesystem access

echo "🚀 Starting optimized Next.js development server..."

# Clear Next.js cache
echo "🧹 Cleaning Next.js cache..."
rm -rf .next

# Set performance environment variables
export NODE_OPTIONS="--max_old_space_size=4096"
export NEXT_TELEMETRY_DISABLED=1
export GENERATE_SOURCEMAP=false
export NEXT_SWC_MINIFY=true

# Start Next.js with Turbopack
echo "🔥 Starting Next.js with Turbopack..."
next dev --turbopack -p 9002