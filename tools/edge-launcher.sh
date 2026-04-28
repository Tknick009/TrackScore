#!/bin/bash
#
# Edge Mode Launcher for Linux/Mac
# 
# This script syncs code from a source directory and launches Edge Mode
# 
# Usage:
#   ./edge-launcher.sh                - Show help
#   ./edge-launcher.sh sync           - Sync files only
#   ./edge-launcher.sh launch         - Sync and launch server
#   ./edge-launcher.sh status         - Show status
#
# Configuration:
#   Edit the SOURCE_DIR variable below to point to your network share or sync folder

SOURCE_DIR="/mnt/network/scoreboard"
# Alternative examples:
# SOURCE_DIR="$HOME/Dropbox/scoreboard"
# SOURCE_DIR="/Volumes/NetworkShare/scoreboard"

echo ""
echo "=========================================="
echo "  Edge Mode Launcher"
echo "=========================================="
echo ""

case "$1" in
    sync)
        echo "Syncing files from: $SOURCE_DIR"
        echo ""
        npx tsx tools/edge-launcher.ts --source "$SOURCE_DIR" --sync-only
        ;;
    launch)
        echo "Syncing files from: $SOURCE_DIR"
        echo ""
        npx tsx tools/edge-launcher.ts --source "$SOURCE_DIR" --launch
        ;;
    status)
        npx tsx tools/edge-launcher.ts --status
        ;;
    *)
        echo "Usage:"
        echo "  ./edge-launcher.sh sync     - Sync files from source directory"
        echo "  ./edge-launcher.sh launch   - Sync files and launch server"
        echo "  ./edge-launcher.sh status   - Show current status"
        echo ""
        echo "Current source directory: $SOURCE_DIR"
        echo ""
        echo "To change the source directory, edit this script."
        ;;
esac
