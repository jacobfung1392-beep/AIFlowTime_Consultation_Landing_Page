# 📋 Setup Instructions for Lead Collection

## ✅ What's Been Updated:

1. **Name field added** - Users must enter their name before WhatsApp number
2. **Both fields required** - Form won't submit unless both are filled
3. **Data collection setup** - Ready to send to Google Sheets

---

## 🔧 How to Set Up Google Sheets Collection:

### Step 1: Create Google Apps Script

1. Go to https://script.google.com/
2. Click **"New Project"**
3. Delete any existing code
4. Copy ALL the code from `google-apps-script.js` file
5. Paste it into the script editor
6. Click the **save icon** (💾) and name it "AIFlowTime Lead Collection"

### Step 2: Deploy as Web App

1. Click **"Deploy"** → **"New deployment"**
2. Click the **gear icon** ⚙️ next to "Select type"
3. Choose **"Web app"**
4. Configure:
   - **Description:** "AIFlowTime Lead Collection"
   - **Execute as:** "Me (your email)"
   - **Who has access:** "Anyone"
5. Click **"Deploy"**
6. Click **"Authorize access"** and grant permissions
7. **Copy the Web App URL** (it looks like: `https://script.google.com/macros/s/AKfycby.../exec`)

### Step 3: Update Your Website

1. Open `main.js` file
2. Find this line (around line 697):
   ```javascript
   const googleScriptURL = 'YOUR_GOOGLE_SCRIPT_URL';
   ```
3. Replace `'YOUR_GOOGLE_SCRIPT_URL'` with your actual URL:
   ```javascript
   const googleScriptURL = 'https://script.google.com/macros/s/AKfycby.../exec';
   ```
4. Save the file
5. Deploy to Firebase:
   ```bash
   npx firebase deploy --only hosting
   ```

---

## 📊 Where to Find Your Leads:

### Option 1: Google Sheets (Recommended)

After setup, all submissions will be saved to a Google Sheet:

1. Go to https://drive.google.com/
2. Look for **"AIFlowTime Lead Collection"** spreadsheet
3. Open it to see all submissions with:
   - Timestamp
   - Name
   - WhatsApp Number
   - Page (where they signed up)
   - Hong Kong Time

### Option 2: Browser Console (Backup)

While testing or if Google Sheets isn't set up yet:

1. Open your website
2. Press `F12` to open Developer Tools
3. Go to **"Console"** tab
4. Submit the form
5. You'll see: `Form submitted: {name, whatsapp, timestamp, page}`

### Option 3: LocalStorage (Backup)

Data is also saved in browser's localStorage:

1. Open Developer Tools (`F12`)
2. Go to **"Application"** tab (Chrome) or **"Storage"** tab (Firefox)
3. Click **"Local Storage"** → your website URL
4. Look for key: `aiflowtime_submissions`
5. Click to see all submissions in JSON format

---

## 🧪 Testing:

1. Go to your website: https://aiflowtime-hk.web.app
2. Click "領取2026年5個必學AI指南" button
3. Enter test data:
   - Name: "Test User"
   - WhatsApp: "+852 1234 5678"
4. Click "領取免費指南"
5. Check your Google Sheet for the new row

---

## 📱 What Users See:

**Modal popup with:**
- Title: "領取免費2026年AI指南"
- Description: "輸入你的資料，我們會將指南發送給你"
- **Name input:** "你的名字" (required, min 2 characters)
- **WhatsApp input:** "+852 1234 5678" (required, phone format)
- **Submit button:** "領取免費指南"

Both fields must be filled to submit!

---

## 🔒 Privacy & Security:

- Data is sent securely via HTTPS
- Google Sheets is private (only you can access)
- No data is publicly visible
- Users are redirected to guide page after submission

---

## 💡 Tips:

1. **Test first** - Use a test name/number to verify everything works
2. **Check spam** - Make sure the Google Sheet is created in your Drive
3. **Share access** - You can share the Google Sheet with team members
4. **Export data** - Download as CSV/Excel anytime from Google Sheets
5. **Backup** - Data is also saved in browser localStorage as backup

---

## ❓ Troubleshooting:

**Problem:** "YOUR_GOOGLE_SCRIPT_URL" error in console
- **Solution:** You haven't replaced the placeholder URL in `main.js`

**Problem:** No data in Google Sheet
- **Solution:** Check if Web App is deployed with "Anyone" access

**Problem:** "Authorization required" error
- **Solution:** Re-deploy the script and grant permissions

**Problem:** Can't find the spreadsheet
- **Solution:** Check your Google Drive, it's named "AIFlowTime Lead Collection"

---

## 📞 Need Help?

If you encounter any issues, check:
1. Browser console for error messages (F12)
2. Google Apps Script execution logs
3. Make sure the Web App URL is correct in `main.js`

