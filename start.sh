#!/bin/bash
echo "============================================"
echo "  Track and Field Scoreboard"
echo "============================================"
echo ""

export EDGE_MODE=true
export NODE_ENV=development

# Sync folder path is read from data/edge-config.json (configured via the UI).
# To override, uncomment one of the lines below:
# SOURCE_DIR="$HOME/Dropbox/scoreboard"
# SOURCE_DIR="$HOME/Google Drive/TrackScore"
# SOURCE_DIR="/mnt/network/scoreboard"

echo "Checking for app updates from configured sync folder..."
if [ -n "$SOURCE_DIR" ]; then
    npx tsx tools/edge-launcher.ts --source "$SOURCE_DIR" --sync-only
else
    npx tsx tools/edge-launcher.ts --sync-only
fi

if [ $? -ne 0 ]; then
    echo ""
    echo "WARNING: Sync had issues, but continuing with server start..."
    echo ""
else
    echo ""
    echo "Sync check complete."
    echo ""
fi

echo "Installing/updating dependencies..."
npm install --silent
echo "Dependencies up to date."
echo ""

echo "Starting server..."
echo "Server will run at http://localhost:5000"
echo "Press Ctrl+C to stop."
echo ""

npm run dev
