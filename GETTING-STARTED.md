# Track & Field Scoreboard - Getting Started

A simple guide to get your scoreboard running on your computer.

---

## Step 1: Install Node.js (One Time Only)

Before running the scoreboard, you need Node.js installed on your computer.

1. Go to **https://nodejs.org**
2. Click the big green **"LTS"** button to download
3. Run the installer and follow the prompts (just click "Next" through everything)
4. Restart your computer after installing

---

## Step 2: Download the Scoreboard

1. Download the scoreboard files (as a ZIP file)
2. Extract/unzip the folder to your computer (e.g., Desktop or Documents)

---

## Step 3: Start the Scoreboard

### On Windows:
- Double-click **`start-scoreboard.bat`**

### On Mac:
- Double-click **`start-scoreboard.command`**
- If Mac says it can't open it: Right-click > Open > Click "Open" in the popup

### On Linux:
- Open a terminal in the folder
- Run: `./start-scoreboard.sh`

---

## Step 4: Use the Scoreboard

Your browser will automatically open to **http://localhost:6000**

If it doesn't open automatically, open your browser and go to that address.

---

## Sharing Results with Ngrok (Optional)

To let people outside your network see the scoreboard:

1. Download Ngrok from **https://ngrok.com** and create a free account
2. Open a new terminal/command prompt
3. Run: `ngrok http 6000`
4. Share the HTTPS URL that appears (looks like `https://abc123.ngrok-free.app`)

---

## Downloading Meet Data from Cloud

If you set up your meet on another computer (like Replit) and want to download it:

1. Click **"Download from Cloud"** on the homepage
2. Enter the cloud server URL (e.g., your Ngrok URL or Replit URL)
3. Enter the 6-character meet code
4. Click "Preview Meet" then "Download Meet"

---

## Stopping the Scoreboard

- Close the terminal/command prompt window, OR
- Press **Ctrl+C** in the terminal window

---

## Troubleshooting

### "Node.js is not installed"
- Download and install Node.js from https://nodejs.org
- Restart your computer after installing

### "Port 6000 is already in use"
- Another program is using that port
- Close other programs or restart your computer

### Browser shows "Cannot connect"
- Make sure the terminal window is still running
- Wait 10 seconds and refresh the page

### Mac says "cannot be opened because it is from an unidentified developer"
- Right-click the file
- Click "Open"
- Click "Open" again in the popup

---

## Need Help?

Contact your scoreboard administrator for assistance.
