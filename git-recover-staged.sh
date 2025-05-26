#!/bin/bash

# Find the most recent index file in the .git directory
index_file=$(find .git -name "index.lock*" -o -name "index.*" | sort -r | head -n 1)

if [ -z "$index_file" ]; then
  echo "No index file found"
  exit 1
fi

echo "Using index file: $index_file"

# Create a temporary directory
tmp_dir=$(mktemp -d)
echo "Created temporary directory: $tmp_dir"

# Copy the index file to the temporary directory
cp "$index_file" "$tmp_dir/index"

# Set up a temporary git repository
mkdir -p "$tmp_dir/.git/objects"
mkdir -p "$tmp_dir/.git/refs/heads"
echo "ref: refs/heads/master" > "$tmp_dir/.git/HEAD"

# Copy objects from the original repository
cp -r .git/objects/* "$tmp_dir/.git/objects/"

# Change to the temporary directory
cd "$tmp_dir"

# Try to recover the staged changes
git status
git ls-files --stage

# Create a commit with the recovered changes
git commit -m "Recovered staged changes"

echo "Recovered files are in: $tmp_dir"
