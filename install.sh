#!/bin/bash

echo "============================================"
echo "  Track & Field Scoreboard - Local Install"
echo "============================================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed."
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "ERROR: Node.js 18+ required. Found version $(node -v)"
    exit 1
fi

echo "✓ Node.js $(node -v) detected"
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi
echo "✓ Dependencies installed"
echo ""

# Create data directory
mkdir -p data
echo "✓ Data directory created"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "EDGE_MODE=true" > .env
    echo "SESSION_SECRET=$(openssl rand -hex 32)" >> .env
    echo "✓ Environment file created"
else
    echo "✓ Environment file already exists"
fi

echo ""
echo "============================================"
echo "  Installation Complete!"
echo "============================================"
echo ""
echo "To start the application:"
echo "  npm run dev"
echo ""
echo "Or with Edge Mode explicitly enabled:"
echo "  EDGE_MODE=true npm run dev"
echo ""
echo "To sync meet data from cloud server:"
echo "  npx tsx tools/edge-setup.ts setup --cloud-url <URL> --meet-code <CODE>"
echo ""
echo "The application will run at http://localhost:5000"
echo ""
echo "FinishLynx TCP Ports (local connection):"
echo "  - Results: 5555"
echo "  - Clock:   5556"
echo "  - Field:   5557"
echo ""
