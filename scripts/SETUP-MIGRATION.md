# Run the migration (3 steps)

The script can’t run until you do this **one-time setup**. Each step is a single link and a couple of clicks.

---

## Step 1: Turn on Google Sheets API

1. Open: **https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=aiflowtime-hk**
2. Click **Enable** (if the button says “Manage” instead, it’s already on — skip to Step 2).

---

## Step 2: Download the key and put it in the project

1. Open: **https://console.firebase.google.com/project/aiflowtime-hk/settings/serviceaccounts/adminsdk**
2. Click **Generate new private key** → confirm → a JSON file will download.
3. Rename that file to: **service-account.json**
4. Move it into your **project root** (the folder that contains `package.json` and `scripts/`).

So the file should be here:

`AIFlowTime_Consultation_Landing_Page/service-account.json`

---

## Step 3: Share the Google Sheet with the key

1. Open the **service-account.json** file in a text editor.
2. Find the line **"client_email"** and copy the email (e.g. `firebase-adminsdk-xxxxx@aiflowtime-hk.iam.gserviceaccount.com`).
3. Open your consultation sheet: **https://docs.google.com/spreadsheets/d/1_WW7PTjYibD4G8l-E7-dtJVr9eaKq7CqeLb6a0iTeBA/edit**
4. Click **Share** → paste that email → set permission to **Viewer** → uncheck “Notify people” if you like → **Share**.

---

## Run the migration

In the project folder, run:

```bash
node scripts/migrate-consultations-from-sheet.js
```

When it finishes, your Sheet rows will be in Firestore and visible in Workshop CMS → AI Consultation → 申請管理.
