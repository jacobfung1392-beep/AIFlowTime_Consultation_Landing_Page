# Lead Magnet Google Sheet Setup Guide

This guide will help you set up a Google Sheet to collect WhatsApp numbers and names from users who request the free "2026年5個必學AI指南" (Free AI Guide).

## Step 1: Create a New Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click **"Blank"** to create a new spreadsheet
3. Name it: **"AIFlowTime Lead Magnet - Free AI Guide"**
4. The sheet will automatically create a sheet called "Sheet1" - you can rename it to "Lead Magnet Submissions" if you want

## Step 2: Create the Google Apps Script

1. Go to [Google Apps Script](https://script.google.com)
2. Click **"New Project"**
3. Delete any existing code in the editor
4. Open the file `google-apps-script-lead-magnet.js` from your project folder
5. Copy **ALL** the code from that file
6. Paste it into the Google Apps Script editor

## Step 3: Configure the Script (Optional)

The script will automatically create a spreadsheet named **"AIFlowTime Lead Magnet - Free AI Guide"** if it doesn't exist.

**OR** if you want to use a specific spreadsheet you already created:

1. Open your Google Sheet
2. Look at the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit`
3. Copy the `SPREADSHEET_ID_HERE` part
4. In the Google Apps Script editor, find this line (around line 26):
   ```javascript
   // const ss = SpreadsheetApp.openById('SPREADSHEET_ID_HERE');
   ```
5. Uncomment it and replace `SPREADSHEET_ID_HERE` with your actual spreadsheet ID:
   ```javascript
   const ss = SpreadsheetApp.openById('your-actual-spreadsheet-id-here');
   ```
6. Comment out or delete the lines that search by name (lines 28-53)

## Step 4: Deploy the Script as a Web App

1. In the Google Apps Script editor, click **"Deploy"** → **"New deployment"**
2. Click the **gear icon** (⚙️) next to "Select type" and choose **"Web app"**
3. Configure the deployment:
   - **Description**: "Lead Magnet Form Handler" (or any name you prefer)
   - **Execute as**: Select **"Me"** (your email)
   - **Who has access**: Select **"Anyone"** (important!)
4. Click **"Deploy"**
5. You may be asked to authorize the script:
   - Click **"Authorize access"**
   - Choose your Google account
   - Click **"Advanced"** → **"Go to [Project Name] (unsafe)"**
   - Click **"Allow"**
6. After deployment, you'll see a **"Web App URL"** - it looks like:
   ```
   https://script.google.com/macros/s/AKfycbx.../exec
   ```
7. **Copy this URL** - you'll need it in the next step!

## Step 5: Update Your Website Code

1. Open `linktree.html` in your project
2. Find this line (around line 1803):
   ```javascript
   const googleScriptURL = 'YOUR_LEAD_MAGNET_GOOGLE_SCRIPT_URL';
   ```
3. Replace `'YOUR_LEAD_MAGNET_GOOGLE_SCRIPT_URL'` with your actual Web App URL from Step 4:
   ```javascript
   const googleScriptURL = 'https://script.google.com/macros/s/YOUR_ACTUAL_URL_HERE/exec';
   ```
4. Save the file

## Step 6: Test the Setup

1. Deploy your updated `linktree.html` to Firebase:
   ```bash
   npx firebase deploy --only hosting
   ```
2. Visit your linktree page: `https://aiflowtime-hk.web.app/linktree`
3. Click the **"📚 2026年5個必學AI指南"** button
4. Fill in the form with test data:
   - Name: Test User
   - WhatsApp: +852 1234 5678
   - Check the consent checkbox
5. Submit the form
6. Check your Google Sheet - you should see a new row with:
   - Timestamp
   - Name
   - WhatsApp
   - Source (should say "linktree")
   - Submission Date

## Step 7: Verify Data Collection

Your Google Sheet should have these columns:
- **Timestamp** - When the form was submitted (Hong Kong timezone)
- **Name** - User's name
- **WhatsApp** - User's WhatsApp number
- **Source** - Where the submission came from (will show "linktree")
- **Submission Date** - Same as timestamp, formatted for Hong Kong timezone

## Troubleshooting

### Data not appearing in the sheet?
1. Check the browser console (F12) for any errors
2. Verify the Google Script URL is correct in `linktree.html`
3. Check the Google Apps Script execution log:
   - Go to Google Apps Script
   - Click "Executions" in the left menu
   - Check for any errors

### Script deployment issues?
1. Make sure "Who has access" is set to **"Anyone"**
2. Make sure you authorized the script when prompted
3. Try redeploying with a new version

### Need to update the script?
1. Make changes in Google Apps Script editor
2. Click **"Deploy"** → **"Manage deployments"**
3. Click the **pencil icon** (✏️) next to your deployment
4. Click **"New version"**
5. Click **"Deploy"**

## What Gets Collected?

When users fill out the form on the linktree page for the free AI guide, the following data is collected:
- **Name** - User's name
- **WhatsApp Number** - User's WhatsApp number
- **Timestamp** - When they submitted (Hong Kong timezone)
- **Source** - "linktree" (to track where leads came from)

All data is automatically saved to your Google Sheet in real-time!

