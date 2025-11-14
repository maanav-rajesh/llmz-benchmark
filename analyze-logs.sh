#!/bin/bash

# Log Analysis Script
# Calculates pass percentage and average execution time for each log file

LOGS_DIR="./logs"
OUTPUT_CSV="./logs/analysis.csv"

# Check if logs directory exists
if [ ! -d "$LOGS_DIR" ]; then
    echo "Error: logs directory not found at $LOGS_DIR"
    exit 1
fi

# Create CSV header
echo "File,Model,Passes,Failures,Total,Pass%,Total Time (s),Avg Time/Task (s)" > "$OUTPUT_CSV"

# Print table header
printf "%-60s %7s %7s %7s %8s %12s %15s\n" "FILE" "PASSES" "FAILS" "TOTAL" "PASS%" "TOTAL TIME" "AVG TIME/TASK"
printf "%-60s %7s %7s %7s %8s %12s %15s\n" "----" "------" "-----" "-----" "-----" "----------" "--------------"

# Array to store results for sorting
declare -a results=()

# Process each log file
for log_file in "$LOGS_DIR"/*.log; do
    # Skip if no log files found
    [ -e "$log_file" ] || continue

    filename=$(basename "$log_file")

    # Extract model name from filename (remove .log extension)
    model="${filename%.log}"

    # Count passes (🎉 emoji)
    passes=$(grep -o "🎉" "$log_file" | wc -l | tr -d ' ')

    # Calculate total tasks
    total=30

    # Calculate pass percentage
    pass_pct=$(echo "scale=1; $passes * 100 / $total" | bc)

    # Extract total execution time
    total_time=$(grep "⏱ Total time:" "$log_file" | grep -oE "[0-9]+\.[0-9]+" | head -1)

    # If no time found, set to 0
    if [ -z "$total_time" ]; then
        total_time="0.0"
    fi

    # Calculate average time per task
    avg_time=$(echo "scale=2; $total_time / $total" | bc)

    # Store result for sorting (format: pass_pct|filename|model|passes|failures|total|pass_pct|total_time|avg_time)
    results+=("$pass_pct|$filename|$model|$passes|$failures|$total|$pass_pct|$total_time|$avg_time")
done

# Sort results alphabetically by filename
IFS=$'\n' sorted=($(sort -t'|' -k2 <<<"${results[*]}"))
unset IFS

# Print sorted results
for result in "${sorted[@]}"; do
    IFS='|' read -r _ filename model passes failures total pass_pct total_time avg_time <<< "$result"

    # Print to console
    printf "%-60s %7d %7d %7d %7.1f%% %12.1fs %15.2fs\n" \
        "$filename" "$passes" "$failures" "$total" "$pass_pct" "$total_time" "$avg_time"

    # Append to CSV
    echo "$filename,$model,$passes,$failures,$total,$pass_pct,$total_time,$avg_time" >> "$OUTPUT_CSV"
done

echo ""
echo "Results saved to: $OUTPUT_CSV"
