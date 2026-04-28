#!/bin/bash

# Track & Field Scoreboard - Mac Launcher
# Double-click this file to start the scoreboard

# Change to script directory
cd "$(dirname "$0")"

echo ""
echo "========================================"
echo "   Track & Field Scoreboard"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo ""
    echo "Please download and install Node.js from:"
    echo "https://nodejs.org"
    echo ""
    echo "Choose the LTS version and run the installer."
    echo "After installing, close this window and try again."
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Show Node version
NODE_VERSION=$(node -v)
echo "[OK] Node.js $NODE_VERSION found"

# Check if node_modules exists, if not run npm install
if [ ! -d "node_modules" ]; then
    echo ""
    echo "[SETUP] First time setup - installing dependencies..."
    echo "This may take a few minutes..."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "[ERROR] Failed to install dependencies"
        read -p "Press Enter to exit..."
        exit 1
    fi
    echo ""
    echo "[OK] Dependencies installed successfully!"
fi

# Create data directory if it doesn't exist
mkdir -p data

echo ""
echo "[STARTING] Launching scoreboard on port 6000..."
echo ""
echo "----------------------------------------"
echo "   Open your browser to:"
echo "   http://localhost:6000"
echo "----------------------------------------"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Set environment variables
export PORT=6000
export EDGE_MODE=true

# Open browser after a short delay (in background)
(sleep 3 && open "http://localhost:6000") &

# Start the application
npm run dev
