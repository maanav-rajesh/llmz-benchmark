#!/bin/bash

echo "Stopping all running benchmark processes..."

# Find and kill all pnpm dev:benchmark processes
pgrep -f "pnpm dev:benchmark" | while read pid; do
  echo "Killing pnpm dev:benchmark process: $pid"
  kill -TERM "$pid" 2>/dev/null
done

# Find and kill all node processes related to llmz-server
pgrep -f "llmz-server" | while read pid; do
  echo "Killing llmz-server process: $pid"
  kill -TERM "$pid" 2>/dev/null
done

# Find and kill all python pipeline processes
pgrep -f "python -m pipeline" | while read pid; do
  echo "Killing python pipeline process: $pid"
  kill -TERM "$pid" 2>/dev/null
done

# Find and kill all concurrently processes
pgrep -f "concurrently" | while read pid; do
  echo "Killing concurrently process: $pid"
  kill -TERM "$pid" 2>/dev/null
done

# Wait a moment for graceful termination
sleep 2

# Force kill any remaining processes
echo "Force killing any remaining processes..."

pkill -9 -f "pnpm dev:benchmark" 2>/dev/null
pkill -9 -f "llmz-server" 2>/dev/null
pkill -9 -f "python -m pipeline" 2>/dev/null
pkill -9 -f "concurrently" 2>/dev/null

echo "All benchmark processes have been stopped."
