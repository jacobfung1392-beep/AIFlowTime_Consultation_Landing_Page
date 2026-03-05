# Migrate consultations from Google Sheet to Firestore

One-time migration: reads the **"1 on 1 Consultation"** tab from the Google Sheet and writes each row into Firestore `consultations` with the same field mapping used by the CMS and form.

## Prerequisites

- Node.js and `npm install` in the project root (adds `firebase-admin` and `googleapis`).

## Setup (do once)

1. **Enable Google Sheets API**  
   In [Google Cloud Console](https://console.cloud.google.com/) (project **aiflowtime-hk**):  
   APIs & Services → Library → search "Google Sheets API" → Enable.

2. **Service account key**  
   Firebase Console → Project settings → Service accounts → **Generate new private key**.  
   Save the JSON as `service-account.json` in the **project root** (this path is in `.gitignore`).  
   Or set `GOOGLE_APPLICATION_CREDENTIALS` to the path of the key file.

3. **Share the Sheet with the service account**  
   Open the [consultation spreadsheet](https://docs.google.com/spreadsheets/d/1_WW7PTjYibD4G8l-E7-dtJVr9eaKq7CqeLb6a0iTeBA/edit).  
   Share → add the **service account email** (from the JSON, `client_email`, e.g. `...@aiflowtime-hk.iam.gserviceaccount.com`) with **Viewer** access.

## Run

```bash
node scripts/migrate-consultations-from-sheet.js
```

Migrated rows get `status: 'completed'`. To use `'new'` instead, edit `MIGRATED_STATUS` in the script.
