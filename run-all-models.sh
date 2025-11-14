#!/bin/bash

# Cleanup function to kill all spawned processes
cleanup() {
  echo ""
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
  exit 0
}

# Set up trap to call cleanup on SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# Create logs directory if it doesn't exist
mkdir -p logs

# Array of model names
MODELS=(
  "google-ai:gemini-2.5-flash"
  "google-ai:gemini-2.5-pro"
  "openai:gpt-4.1-nano-2025-04-14"
  "openai:gpt-5-2025-08-07"
  "openai:gpt-5-nano-2025-08-07"
  "openai:gpt-5-mini-2025-08-07"
  "openai:o3-2025-04-16"
  "openai:o4-mini-2025-04-16"
)

# Starting port number
BASE_PORT=3010

# Generate timestamp for log files
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

# Run each model in parallel
for i in "${!MODELS[@]}"; do
  MODEL="${MODELS[$i]}"
  PORT=$((BASE_PORT + i))

  # Create a safe filename from model name (replace : and / with -)
  LOG_FILE="logs/$(echo "$MODEL" | sed 's/[:\\/]/-/g')-${TIMESTAMP}.log"

  echo "Starting $MODEL on port $PORT, logging to $LOG_FILE"

  # Run in background and redirect output to log file
  PORT=$PORT MODEL="$MODEL" IDX="$i" pnpm dev:benchmark > "$LOG_FILE" 2>&1 &
done

echo "All models started. Check logs/ directory for output."
echo "To monitor all logs in real-time: tail -f logs/*-run.log"

# Wait for all background processes to complete
wait

echo "All benchmarks completed."
