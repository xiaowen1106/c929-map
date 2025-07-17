#!/bin/bash

# Quick image optimization script
# Usage: ./quick_optimize.sh [directory_or_file]

# Default settings
MAX_WIDTH=1200
QUALITY=60

if [ $# -eq 0 ]; then
    echo "Usage: $0 [directory_or_file]"
    echo "Examples:"
    echo "  $0 docs/img/activities/  # Optimize all images in activities folder"
    echo "  $0 docs/img/activities/*.jpg  # Optimize all JPG files in activities"
    echo "  $0 docs/img/929hz.png  # Optimize a single file"
    exit 1
fi

target="$1"

if [ -f "$target" ]; then
    # Single file
    echo "Optimizing: $target"
    sips -Z $MAX_WIDTH -s format jpeg -s formatOptions $QUALITY "$target"
    echo "Done!"
elif [ -d "$target" ]; then
    # Directory
    echo "Optimizing all images in: $target"
    cd "$target"
    sips -Z $MAX_WIDTH -s format jpeg -s formatOptions $QUALITY *.jpg *.jpeg *.png 2>/dev/null
    echo "Done!"
else
    echo "Error: $target is not a valid file or directory"
    exit 1
fi 