# Workshop seat reservation + payment (10‑minute window)

This guide sets up:

- **Apply** → reserve a seat for 10 minutes → **Pay** (Stripe Checkout) → **Thank you** page and seat confirmed.

## 1. Firebase project

- You already have project `aiflowtime-hk`.
- Enable **Firestore** and **Cloud Functions** (Blaze plan required for scheduled functions).

## 2. Firestore: add a workshop document

In [Firebase Console](https://console.firebase.google.com) → Firestore → Start collection or use existing.

Create a document:

- **Collection:** `workshops`
- **Document ID:** `ai-beginner-2026` (or match the ID used in your front end)
- **Fields:**

| Field        | Type    | Value example                          |
|-------------|---------|----------------------------------------|
| `title`     | string  | `AI 新手第一課`                         |
| `capacity`  | number  | `30`                                   |
| `priceHkd`  | number  | `500` (or your price in HKD)           |
| `currency`  | string  | `hkd`                                  |
| `imageUrl`  | string  | (optional) URL for Stripe product image |

Optional: use a Stripe Price ID instead of dynamic amount:

- **Field:** `stripePriceId` (string), e.g. `price_xxxxx` from Stripe Dashboard.

## 3. Stripe

1. Create a [Stripe account](https://dashboard.stripe.com) and get:
   - **Secret key** (Dashboard → Developers → API keys): `sk_test_...` or `sk_live_...`
   - **Webhook signing secret**: add an endpoint (see step 5), then copy the **Signing secret** (`whsec_...`).

2. (Optional) Create a product/price in Stripe and set `stripePriceId` on the workshop document. Otherwise the function uses `priceHkd` (in HKD cents: 500 → HK$5.00; use 50000 for HK$500).

## 4. Firebase: set config and deploy Functions

Set Stripe and site URL (replace with your values):

```bash
cd "/Library/1. Vibe Coding with Cursor AI/AIFlowTime_Consultation_Landing_Page"

# Stripe secret key (test or live)
firebase functions:config:set stripe.secret="sk_test_xxxx"

# Webhook signing secret (from Stripe Dashboard after adding endpoint)
firebase functions:config:set stripe.webhook_secret="whsec_xxxx"

# Your site base URL (for success/cancel redirects)
firebase functions:config:set site.url="https://aiflowtime-hk.web.app"
```

Install dependencies and deploy:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions,firestore:rules
```

Note: For Stripe webhooks, Firebase may not expose `rawBody` by default in some runtimes. If the webhook returns signature errors, you may need to switch the webhook to an Express app with `express.raw({ type: 'application/json' })`; the current code assumes `req.rawBody` is available.

## 5. Stripe webhook endpoint

1. Stripe Dashboard → Developers → Webhooks → Add endpoint.
2. **URL:**  
   `https://asia-east2-aiflowtime-hk.cloudfunctions.net/stripeWebhook`  
   (Replace region/project if you changed them.)
3. **Events:** select `checkout.session.completed`.
4. Copy the **Signing secret** and run:
   ```bash
   firebase functions:config:set stripe.webhook_secret="whsec_xxxx"
   ```
   Then redeploy: `firebase deploy --only functions`.

## 6. Frontend: Firebase config

In `ai-beginner-workshop.html`, replace the placeholder Firebase config with your project’s config:

1. Firebase Console → Project settings → Your apps → Web app → Config.
2. Replace the `firebase.initializeApp({ ... })` block with your `apiKey`, `projectId`, `appId` (and optionally `authDomain`, etc.).
3. Remove or comment out the `useEmulator` line for production.

## 7. Flow summary

- User clicks **報名並付款** and submits the form (name, email, WhatsApp, workshop).
- Frontend calls **createWorkshopReservation** (callable). Backend:
  - Checks workshop capacity (pending + confirmed).
  - Creates a **reservation** with `status: pending`, `expiresAt: now + 10 min`.
  - Creates a **Stripe Checkout Session** with `metadata.reservationId`.
  - Returns the Checkout **URL**.
- User is redirected to Stripe and has **10 minutes** to pay.
- On success, Stripe redirects to **workshop-thank-you.html?session_id=...** and sends a webhook.
- **stripeWebhook** receives `checkout.session.completed`, sets reservation to `confirmed` (seat reserved).
- A **scheduled function** runs every 5 minutes and sets `pending` reservations past `expiresAt` to `expired`.

## 8. Optional: multiple workshops

- Add more documents under `workshops` (e.g. `workshop-id-2`).
- In the front end, send `workshopId` in the callable payload (e.g. from a dropdown). The default in the function is `ai-beginner-2026`.

## 9. Troubleshooting

- **“Workshop not found”** → Add the `workshops/ai-beginner-2026` document in Firestore.
- **“This workshop is full”** → Capacity is reached; increase `capacity` or use another workshop ID.
- **Webhook signature failed** → Ensure `stripe.webhook_secret` is the one for this endpoint and you’re using the raw body for verification.
- **Payment succeeds but seat not confirmed** → Check function logs for `stripeWebhook` and that `metadata.reservationId` is set on the Checkout Session.
