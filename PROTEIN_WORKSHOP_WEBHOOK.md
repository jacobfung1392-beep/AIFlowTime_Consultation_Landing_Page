# Protein Workshop Webhook

`confirmPaymentUpload` now sends a signed webhook when a manual-payment workshop application is officially submitted.

This is scoped to the screenshot-upload + final confirm flow only. Stripe stays unchanged.

## Firebase Config

Set these Firebase Function secrets:

```bash
firebase functions:secrets:set PROTEIN_WORKSHOP_WEBHOOK_URL
firebase functions:secrets:set PROTEIN_WORKSHOP_WEBHOOK_SECRET
```

### Production endpoint (OpenClaw Gateway)

- **Webhook URL:** `https://gateway.openclaw.ai/webhook/protein-workshop-confirmed`
- **Secret:** Store only in Firebase Secret Manager (`PROTEIN_WORKSHOP_WEBHOOK_SECRET`). Use the same string on the OpenClaw / Protein gateway so HMAC verification matches. Do not commit the secret to git.

If `PROTEIN_WORKSHOP_WEBHOOK_URL` is unset, `functions/index.js` falls back to the production URL above.

## Trigger Point

- Function: `confirmPaymentUpload`
- Event: applicant has uploaded a payment screenshot and pressed the final confirm button
- Event type: `workshop_application_confirmed`

## Request Format

Headers:

- `content-type: application/json`
- `x-aiflowtime-event: workshop_application_confirmed`
- `x-aiflowtime-registration-id: <registrationId>`
- `x-aiflowtime-timestamp: <ISO timestamp>`
- `x-aiflowtime-signature: <hex hmac sha256>`

Signing input:

- `timestamp + "." + rawJsonBody`

## Payload Shape

Core fields:

```json
{
  "version": 1,
  "eventType": "workshop_application_confirmed",
  "source": "confirmPaymentUpload",
  "registrationId": "abc123",
  "submittedAt": "2026-04-06T08:30:00.000Z",
  "submittedAtHkt": "2026-04-06 16:30 HKT",
  "applicant": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "91234567",
    "whatsapp": "91234567"
  },
  "workshop": {
    "id": "ai-beginner-2026",
    "title": "AI Beginner Workshop",
    "date": "2026年04月20日",
    "time": "19:30",
    "attendanceMode": "online"
  },
  "payment": {
    "screenshotUrl": "https://...",
    "pricePaid": "HK$500"
  },
  "summary": {
    "who": "Jane Doe",
    "what": "AI Beginner Workshop",
    "when": "2026年04月20日 19:30",
    "format": "online"
  },
  "adminBrief": "New workshop application confirmed\nWho: Jane Doe\nWhat: AI Beginner Workshop\nWhen: 2026年04月20日 19:30\nFormat: online\nSubmitted: 2026-04-06 16:30 HKT"
}
```

Compatibility fields are also duplicated at the top level:

- `id`
- `name`
- `userEmail`
- `phone`
- `whatsapp`
- `workshopId`
- `workshopTitle`
- `workshopDate`
- `workshopTime`
- `attendanceMode`
- `paymentScreenshotUrl`
- `selectedRound`
- `selectedRoundLabel`
- `pricePaid`

## Protein Verification Example

Use the exact raw request body if your platform provides it. Do not rebuild the JSON before verifying unless raw bytes are unavailable.

```js
const crypto = require("crypto");

function verifyAiflowtimeWorkshopWebhook({ rawBody, timestamp, signature, secret }) {
  if (!rawBody || !timestamp || !signature || !secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const actualBuf = Buffer.from(String(signature), "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}
```

## Recommended WhatsApp Brief

Protein can send `adminBrief` directly, or rebuild it from `summary`.

Suggested format:

```text
New workshop application confirmed
Who: {{summary.who}}
What: {{summary.what}}
When: {{summary.when}}
Format: {{summary.format}}
Submitted: {{submittedAtHkt}}
```

Optional extras:

- `applicant.email`
- `applicant.phone`
- `payment.screenshotUrl`

## Expected Protein Behavior

1. Receive the webhook.
2. Verify `x-aiflowtime-signature`.
3. Reject replayed or stale timestamps if desired.
4. Build or reuse `adminBrief`.
5. Send the brief to Jacob via Protein's WhatsApp sending capability.
