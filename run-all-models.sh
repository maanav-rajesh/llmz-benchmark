#!/bin/bash

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

# Run each model in parallel
for i in "${!MODELS[@]}"; do
  MODEL="${MODELS[$i]}"
  PORT=$((BASE_PORT + i))

  # Create a safe filename from model name (replace : and / with -)
  LOG_FILE="logs/$(echo "$MODEL" | sed 's/[:\\/]/-/g')-run-no-hints-think.log"

  echo "Starting $MODEL on port $PORT, logging to $LOG_FILE"

  # Run in background and redirect output to log file
  PORT=$PORT MODEL="$MODEL" IDX="$i" pnpm dev:benchmark > "$LOG_FILE" 2>&1 &
done

echo "All models started. Check logs/ directory for output."
echo "To monitor all logs in real-time: tail -f logs/*-run.log"

# Wait for all background processes to complete
wait

echo "All benchmarks completed."
