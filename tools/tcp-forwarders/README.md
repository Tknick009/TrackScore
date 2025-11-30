# Lynx TCP-to-HTTP Forwarder

This tool forwards timing data from FinishLynx and FieldLynx to your online Track & Field scoring system via HTTP.

## Why Use This?

When your FinishLynx/FieldLynx computers are on a different network than your Replit server (which they typically are), direct TCP connections won't work due to firewalls and NAT. This forwarder:

1. Runs on your local network (same computer as FinishLynx/FieldLynx or any computer that can reach them)
2. Listens for the TCP connections from FinishLynx/FieldLynx
3. Forwards the data to your Replit server via HTTP (which works through firewalls)

## Ports

| Port | Source | Data Type |
|------|--------|-----------|
| 5055 | FinishLynx | Track Results (timing, places) |
| 5056 | FinishLynx | Running Clock Time |
| 5057 | FieldLynx | Field Event Results |

## Setup

### Prerequisites

1. Install [Node.js](https://nodejs.org/) (LTS version recommended)

### Configuration

#### FinishLynx Setup

1. Open FinishLynx
2. Go to **Options > Scoreboard**
3. Add scoreboard outputs for:
   - **Clock**: Port 5056, Script: Lynx JSON format
   - **Results**: Port 5055, Script: Lynx JSON format
4. Point these at the IP address of the computer running the forwarder

#### FieldLynx Setup

1. Open FieldLynx
2. Go to **Preferences > Scoreboard**
3. Configure output on Port 5057
4. Point at the IP address of the computer running the forwarder

### Running the Forwarder

#### Windows

1. Double-click `lynx-forwarder.bat`
2. Enter your Replit app URL when prompted (e.g., `https://your-app.replit.app`)
3. The forwarder will start listening for connections

#### Mac/Linux

```bash
# Set your Replit URL
export FORWARD_URL="https://your-app.replit.app"

# Run the forwarder
node lynx-tcp-forwarder.cjs
```

### Environment Variables

You can customize the ports and URL using environment variables:

```bash
export FORWARD_URL="https://your-app.replit.app"
export CLOCK_PORT=5056      # Default: 5056
export RESULTS_PORT=5055    # Default: 5055  
export FIELD_PORT=5057      # Default: 5057
```

## Testing

To test if the forwarder is working:

1. Start the forwarder
2. In FinishLynx, arm a lane
3. You should see output in the forwarder console showing data being forwarded
4. Check your Replit app's display board to see the data

## Troubleshooting

### "Port already in use"

Another application is using the same port. Either:
- Close the conflicting application
- Change the port using environment variables

### "Forward failed: ECONNREFUSED"

The forwarder can't reach your Replit server. Check:
- Your FORWARD_URL is correct
- Your computer has internet access
- The Replit app is running

### No data appearing

1. Verify FinishLynx/FieldLynx scoreboard settings point to the forwarder computer
2. Check the correct ports are configured
3. Ensure the JSON scoreboard script is selected in FinishLynx
