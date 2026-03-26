## Free Material Gmail Setup

Set these environment variables for the `requestFreeMaterialDownload` function before relying on live email delivery:

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_SENDER`
- `GMAIL_REPLY_TO` (optional)

Recommended values:

- `GMAIL_SENDER`: `jacobfung@AIFLOWTIME.com`
- `GMAIL_REPLY_TO`: same as sender unless you want replies routed elsewhere

Required Google Cloud / Workspace setup:

1. Enable the Gmail API in the Firebase project's linked Google Cloud project.
2. Create OAuth credentials for the Workspace mailbox.
3. Generate a refresh token for `jacobfung@AIFLOWTIME.com` with Gmail send scope.
4. Store the credentials securely in your Firebase Functions environment or Secret Manager.

Notes:

- The function will save the lead to Firestore even when email delivery is not configured yet.
- Delivery mode `auto` attaches the PDF when it is small enough, otherwise it sends a download link.
- Collection used for submissions and delivery logs: `freeMaterialLeads`.
