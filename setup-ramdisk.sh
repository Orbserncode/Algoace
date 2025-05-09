#!/bin/bash

# Script to create a RAM disk for Next.js build directory
# This addresses the "Slow filesystem detected" warning

echo "Setting up RAM disk for Next.js build directory..."

# Stop any running Next.js processes
echo "Stopping any running Next.js processes..."
pkill -f "next"

# Clean up existing .next directory
echo "Cleaning up existing .next directory..."
rm -rf /workspaces/Algoace/.next

# Create RAM disk directory if it doesn't exist
echo "Creating RAM disk directory..."
mkdir -p /tmp/nextjs-ramdisk

# Mount RAM disk (1GB size)
echo "Mounting RAM disk..."
sudo mount -t tmpfs -o size=1G tmpfs /tmp/nextjs-ramdisk

# Create .next directory in RAM disk
echo "Creating .next directory in RAM disk..."
mkdir -p /tmp/nextjs-ramdisk/.next

# Create symbolic link
echo "Creating symbolic link from project .next to RAM disk..."
ln -sf /tmp/nextjs-ramdisk/.next /workspaces/Algoace/.next

# Set permissions
echo "Setting permissions..."
chmod -R 755 /tmp/nextjs-ramdisk

echo "RAM disk setup complete!"
echo "The Next.js build directory is now on a RAM disk, which should be much faster."
echo "To start Next.js with this configuration, run: npm run dev"