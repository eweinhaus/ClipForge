#!/bin/bash

# ClipForge Export Debug Script
# This script helps debug export issues by providing detailed FFmpeg information

echo "=== ClipForge Export Debug Script ==="
echo ""

# Check if FFmpeg is available
echo "1. Checking FFmpeg availability..."
if command -v ffmpeg &> /dev/null; then
    echo "✅ FFmpeg found: $(ffmpeg -version | head -n1)"
else
    echo "❌ FFmpeg not found in PATH"
fi

echo ""

# Check if input files exist
echo "2. Checking input files..."
if [ "$#" -eq 0 ]; then
    echo "Usage: $0 <video_file1> [video_file2] ..."
    echo "Example: $0 clip1.mp4 clip2.mp4"
    exit 1
fi

for file in "$@"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
        # Get basic info
        echo "   Duration: $(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$file" 2>/dev/null || echo "Unknown")"
        echo "   Resolution: $(ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$file" 2>/dev/null || echo "Unknown")"
        echo "   Codec: $(ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "$file" 2>/dev/null || echo "Unknown")"
    else
        echo "❌ $file not found"
    fi
done

echo ""

# Test concatenation
echo "3. Testing concatenation method..."
if [ "$#" -ge 2 ]; then
    echo "Testing filter_complex concatenation with first 2 files..."
    
    # Create a test output
    TEST_OUTPUT="test_concat_$(date +%s).mp4"
    
    # Get resolutions
    RES1=$(ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$1" 2>/dev/null)
    RES2=$(ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$2" 2>/dev/null)
    
    echo "Resolution 1: $RES1"
    echo "Resolution 2: $RES2"
    
    # Build filter complex with scaling and audio normalization
    FILTER_COMPLEX="[0:a]aresample=48000[a0];[1:a]aresample=48000[a1];[0:v][a0][1:v][a1]concat=n=2:v=1:a=1[outv][outa]"
    
    echo "Running: ffmpeg -i \"$1\" -i \"$2\" -filter_complex \"$FILTER_COMPLEX\" -map \"[outv]\" -map \"[outa]\" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k \"$TEST_OUTPUT\""
    
    if ffmpeg -i "$1" -i "$2" -filter_complex "$FILTER_COMPLEX" -map "[outv]" -map "[outa]" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k "$TEST_OUTPUT" -y 2>/dev/null; then
        echo "✅ Concatenation test successful: $TEST_OUTPUT"
        echo "   Output duration: $(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$TEST_OUTPUT" 2>/dev/null || echo "Unknown")"
        echo "   Output resolution: $(ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$TEST_OUTPUT" 2>/dev/null || echo "Unknown")"
        
        # Clean up test file
        rm -f "$TEST_OUTPUT"
        echo "   Test file cleaned up"
    else
        echo "❌ Concatenation test failed"
    fi
else
    echo "Skipping concatenation test (need at least 2 files)"
fi

echo ""
echo "=== Debug Complete ==="
