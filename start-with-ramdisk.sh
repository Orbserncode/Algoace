#!/bin/bash

# Script to start Next.js with RAM disk for build directory
# This addresses the "Slow filesystem detected" warning

echo "Starting Next.js with RAM disk for build directory..."

# Stop any running Next.js processes
echo "Stopping any running Next.js processes..."
pkill -f "next" || true

# Clean up existing .next directory
echo "Cleaning up existing .next directory..."
rm -rf /workspaces/Algoace/.next

# Create RAM disk directory
echo "Creating RAM disk directory..."
mkdir -p /tmp/nextjs-build

# Set environment variables
export USE_RAMDISK=true
export NODE_OPTIONS="--max_old_space_size=4096"
export NEXT_TELEMETRY_DISABLED=1

# Start Next.js
echo "Starting Next.js with RAM disk..."
cd /workspaces/Algoace && next dev --turbopack -p 9002