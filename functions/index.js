/**
 * Workshop Cloud Functions for AIFLOWTIME
 * - createWorkshopReservation: creates pending reservation, returns Stripe Checkout URL
 * - stripeWebhook: on payment success, confirms reservation (seat reserved)
 * - releaseExpiredReservations: scheduled job to mark expired pendings
 * - getWorkshopPrice: returns server-verified workshop price (with discount)
 * - confirmPaymentUpload: validates screenshot upload
 * - onRegistrationCreated: Firestore trigger — recomputes workshop enrolled from pending+confirmed
 * - repairWorkshopEnrollmentCounts: one-off repair endpoint for derived counters
 * - inspectProteinWorkshopWebhook: signed receiver used for workshop webhook smoke tests
 * - upsertCarousel: OpenClaw HMAC webhook -> carouselProjects (template factory)
 * - confirmPaymentUpload: optional SIMPLE_BOOKING_WEBHOOK_URL (plain JSON POST) OR HMAC Protein webhook; optional Twilio via WORKSHOP_WHATSAPP_ALERT_JSON
 * - publicWorkshopEvents: GET JSON — all Firestore `workshops` (optional ?visibleOnly=1)
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentWritten, onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const crypto = require("crypto");
const Stripe = require("stripe");
const { google } = require("googleapis");
const { defineSecret } = require("firebase-functions/params");

admin.initializeApp();
const db = admin.firestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" });

const RESERVATION_MINUTES = 10;
const WORKSHOP_ID_DEFAULT = "ai-beginner-2026";
const REGION = "asia-east2";
const DEFAULT_PROTEIN_WORKSHOP_WEBHOOK_URL = "https://gateway.openclaw.ai/webhook/protein-workshop-confirmed";
/**
 * Manual-payment confirm: if non-empty, POST plain JSON `{ id, ...registration }` here and **skip** the HMAC Protein webhook.
 * Paste your stable HTTPS once (e.g. Named Cloudflare Tunnel → OpenClaw `/webhook/booking`). No Firebase secret for this URL.
 * Leave "" to use PROTEIN_WORKSHOP_WEBHOOK_URL / default + HMAC instead.
 */
const SIMPLE_BOOKING_WEBHOOK_URL =
  "https://stonier-pa-incorrectly.ngrok-free.dev/webhook/booking";
const FREE_MATERIAL_COLLECTION = "freeMaterialLeads";
const FREE_MATERIAL_ATTACHMENT_LIMIT = 7 * 1024 * 1024;

/** Secret for OpenClaw / Protein webhook HMAC (set via `firebase functions:secrets:set HMAC_SECRET`). */
const openclawCarouselHmacSecret = defineSecret("HMAC_SECRET");
const proteinWorkshopWebhookUrl = defineSecret("PROTEIN_WORKSHOP_WEBHOOK_URL");
const proteinWorkshopWebhookSecret = defineSecret("PROTEIN_WORKSHOP_WEBHOOK_SECRET");
/** Optional: JSON for Twilio WhatsApp admin alert — see WORKSHOP_PAYMENT_SETUP.md. */
const workshopWhatsAppAlertJson = defineSecret("WORKSHOP_WHATSAPP_ALERT_JSON");

/**
 * Create a pending reservation and Stripe Checkout Session.
 * Callable from client with: { workshopId?, name, email, whatsapp, workshopEvent? }
 * Returns: { url } to redirect user to Stripe Checkout.
 */
exports.createWorkshopReservation = onCall(
  { region: REGION, timeoutSeconds: 30, cors: true, invoker: "public" },
  async (request) => {
    const { workshopId = WORKSHOP_ID_DEFAULT, name, email, whatsapp, workshopEvent } = request.data || {};
    if (!name || !email) {
      throw new HttpsError("invalid-argument", "name and email are required");
    }

    const workshopRef = db.collection("workshops").doc(workshopId);
    const workshopSnap = await workshopRef.get();
    if (!workshopSnap.exists) {
      throw new HttpsError("not-found", "Workshop not found. Add a workshop document first.");
    }
    const workshop = workshopSnap.data();
    const capacity = workshop.capacity ?? 30;
    const priceHkd = workshop.priceHkd ?? 0;
    const currency = (workshop.currency || "hkd").toLowerCase();
    const title = workshop.title || workshopId;

    // Count reserved slots (pending + confirmed)
    const reservedSnap = await db
      .collection("reservations")
      .where("workshopId", "==", workshopId)
      .where("status", "in", ["pending", "confirmed"])
      .get();
    if (reservedSnap.size >= capacity) {
      throw new HttpsError("resource-exhausted", "This workshop is full.");
    }

    const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);
    const reservationRef = db.collection("reservations").doc();
    const reservationId = reservationRef.id;

    const baseUrl = process.env.SITE_URL || "https://aiflowtime-hk.web.app";
    const successUrl = `${baseUrl}/workshop-thank-you.html?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/ai-beginner-workshop.html#signup`;

    const sessionParams = {
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email,
      metadata: {
        reservationId,
        workshopId,
        name: (name || "").substring(0, 500),
        whatsapp: (whatsapp || "").substring(0, 100),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: priceHkd > 0 ? Math.round(priceHkd * 100) : 0,
            product_data: {
              name: title,
              description: workshopEvent ? `活動：${workshopEvent}` : undefined,
              images: workshop.imageUrl ? [workshop.imageUrl] : undefined,
            },
          },
        },
      ],
    };

    if (workshop.stripePriceId) {
      sessionParams.line_items = [{ price: workshop.stripePriceId, quantity: 1 }];
    } else if (priceHkd <= 0) {
      sessionParams.line_items[0].price_data.unit_amount = 50000; // 500.00 HKD fallback
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    await reservationRef.set({
      workshopId,
      name,
      email,
      whatsapp: whatsapp || "",
      workshopEvent: workshopEvent || "",
      status: "pending",
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      stripeSessionId: session.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { url: session.url, reservationId, expiresAt: expiresAt.toISOString() };
  }
);

/**
 * Stripe webhook: on checkout.session.completed, confirm the reservation.
 */
exports.stripeWebhook = onRequest(
  { region: REGION, timeoutSeconds: 60 },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).end();
      return;
    }
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
    if (!endpointSecret) {
      console.warn("STRIPE_WEBHOOK_SECRET not set");
      res.status(500).send("Webhook secret not configured");
      return;
    }

    let event;
    try {
      const rawBody = typeof req.rawBody === "string" ? req.rawBody : (req.rawBody && req.rawBody.toString ? req.rawBody.toString("utf8") : req.body);
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const reservationId = session.metadata?.reservationId;
      if (!reservationId) {
        console.warn("checkout.session.completed without reservationId in metadata");
        res.status(200).send("ok");
        return;
      }
      const ref = db.collection("reservations").doc(reservationId);
      await ref.update({
        status: "confirmed",
        confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
        stripePaymentIntent: session.payment_intent || null,
      });
      console.log("Reservation confirmed:", reservationId);
    }

    res.status(200).send("ok");
  }
);

/**
 * Get the verified workshop price (with member discount + optional promo code).
 * Callable from client: { workshopId, promoCode? }
 * Returns: { price, discounted, discountApplied, promoApplied, promoLabel, promoError,
 *            originalPrice, numericOriginal, numericDiscounted }
 */
exports.getWorkshopPrice = onCall(
  { region: REGION, cors: true, invoker: "public" },
  async (request) => {
    const { workshopId, promoCode } = request.data || {};
    if (!workshopId) {
      throw new HttpsError("invalid-argument", "workshopId is required");
    }

    const workshopSnap = await db.collection("workshops").doc(workshopId).get();
    if (!workshopSnap.exists) {
      throw new HttpsError("not-found", "Workshop not found");
    }

    const workshop = workshopSnap.data();
    const priceStr = workshop.price || "免費";

    const numMatch = priceStr.match(/[\d,]+/);
    if (!numMatch || priceStr === "免費") {
      return { price: priceStr, discounted: priceStr, discountApplied: false, promoApplied: false, originalPrice: priceStr };
    }

    const original = parseInt(numMatch[0].replace(/,/g, ""));
    const isAuthenticated = !!request.auth;
    let current = original;
    let memberDiscountApplied = false;
    let promoApplied = false;
    let promoLabel = "";
    let promoError = "";

    // 1) Member 5% discount
    if (isAuthenticated) {
      current = Math.round(current * 0.95);
      memberDiscountApplied = true;
    }

    // 2) Promo code discount (stacks on top of member discount)
    //    Codes are stored in the global `discountCodes` collection.
    //    Workshops reference them via `appliedDiscountIds` array.
    if (promoCode) {
      const code = promoCode.trim().toUpperCase();

      // Fetch discount codes linked to this workshop
      const appliedIds = workshop.appliedDiscountIds || [];
      let match = null;

      // Also support legacy inline discountCodes for backwards compat
      const legacyCodes = workshop.discountCodes || [];
      const legacyMatch = legacyCodes.find((c) => (c.code || "").toUpperCase() === code);

      if (appliedIds.length > 0) {
        // Fetch all linked global discount code docs
        const dcSnaps = await Promise.all(
          appliedIds.map((id) => db.collection("discountCodes").doc(id).get())
        );
        for (const snap of dcSnaps) {
          if (snap.exists) {
            const dcData = snap.data();
            if ((dcData.code || "").toUpperCase() === code) {
              match = dcData;
              break;
            }
          }
        }
      }

      // Fallback to legacy inline codes
      if (!match && legacyMatch) {
        match = legacyMatch;
      }

      if (!match) {
        promoError = "❌ 折扣碼無效";
      } else {
        // Check expiry
        if (match.expiresAt) {
          const expiryDate = match.expiresAt.toDate ? match.expiresAt.toDate() : new Date(match.expiresAt);
          if (expiryDate < new Date()) {
            promoError = "❌ 此折扣碼已過期";
          }
        }
        // Check usage limit
        if (!promoError && match.maxUses != null) {
          const usageSnap = await db
            .collection("registrations")
            .where("workshopId", "==", workshopId)
            .where("promoCode", "==", code)
            .where("status", "in", ["pending", "confirmed"])
            .get();
          if (usageSnap.size >= match.maxUses) {
            promoError = "❌ 此折扣碼已達使用上限";
          }
        }
      }

      if (!promoError && match) {
        if (match.type === "percent") {
          const reduction = Math.round(current * (match.amount / 100));
          current = current - reduction;
          promoLabel = "-" + match.amount + "%";
        } else {
          current = Math.max(0, current - match.amount);
          promoLabel = "-HKD " + match.amount;
        }
        promoApplied = true;
      }
    }

    return {
      price: priceStr,
      discounted: "HKD " + current,
      discountApplied: memberDiscountApplied,
      promoApplied: promoApplied,
      promoLabel: promoLabel,
      promoError: promoError,
      originalPrice: priceStr,
      numericOriginal: original,
      numericDiscounted: current,
    };
  }
);

/**
 * Confirm a payment screenshot upload — validates upload only.
 * Enrollment is derived from registrations via Firestore triggers.
 */
exports.confirmPaymentUpload = onCall(
  {
    region: REGION,
    cors: true,
    invoker: "public",
    secrets: [
      proteinWorkshopWebhookUrl,
      proteinWorkshopWebhookSecret,
      workshopWhatsAppAlertJson,
    ],
  },
  async (request) => {
    const { registrationId, workshopId } = request.data || {};
    if (!registrationId || !workshopId) {
      throw new HttpsError("invalid-argument", "registrationId and workshopId are required");
    }

    const regRef = db.collection("registrations").doc(registrationId);
    const regSnap = await regRef.get();
    if (!regSnap.exists) {
      throw new HttpsError("not-found", "Registration not found");
    }

    const reg = regSnap.data();
    if (!reg.paymentScreenshotUrl) {
      throw new HttpsError("failed-precondition", "No payment screenshot uploaded");
    }

    if (reg.applicationSubmittedAt) {
      return { success: true, alreadyCounted: true, alreadySubmitted: true };
    }

    await regRef.update({
      _enrollmentCounted: true,
      applicationSubmittedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Notify when user officially applies (confirm apply after payment proof).
    const updatedSnap = await regRef.get();
    const updatedReg = updatedSnap.exists ? updatedSnap.data() : {};
    const payload = _buildProteinWorkshopAlertPayload(registrationId, updatedReg);
    const webhookResult = (SIMPLE_BOOKING_WEBHOOK_URL || "").trim()
      ? await _sendSimpleBookingWebhook(registrationId, updatedReg, await _computeSimpleWebhookExtras(updatedReg))
      : await _sendProteinWorkshopWebhook(payload);
    const whatsappResult = await _sendTwilioWhatsAppEnrollmentAlert(payload);

    return {
      success: true,
      alreadyCounted: !!reg._enrollmentCounted,
      alreadySubmitted: false,
      webhook: {
        sent: !!webhookResult.sent,
        skipped: !!webhookResult.skipped,
        status: webhookResult.status || null,
        reason: webhookResult.reason || null,
      },
      whatsappAlert: {
        sent: !!whatsappResult.sent,
        skipped: !!whatsappResult.skipped,
        status: whatsappResult.status || null,
        reason: whatsappResult.reason || null,
      },
    };
  }
);

function _asDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === "function") {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function _toIsoString(value) {
  const date = _asDate(value);
  return date ? date.toISOString() : "";
}

function _toHongKongDateTime(value) {
  const date = _asDate(value);
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const map = {};
  parts.forEach((part) => {
    if (part.type !== "literal") map[part.type] = part.value;
  });
  if (!map.year || !map.month || !map.day || !map.hour || !map.minute) return "";
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute} HKT`;
}

function _normalizeAttendanceMode(value) {
  const raw = _cleanText(value, 30).toLowerCase();
  if (raw === "online") return "online";
  if (raw === "offline") return "offline";
  if (raw === "both" || raw === "hybrid") return "hybrid";
  return raw || "offline";
}

function _buildProteinWorkshopAdminBrief(payload) {
  const lines = [
    "New workshop application confirmed",
    `Who: ${payload.summary.who || payload.registrationId}`,
    `What: ${payload.summary.what || payload.workshop.id || "Unknown workshop"}`,
    `When: ${payload.summary.when || payload.submittedAtHkt || payload.submittedAt || "Unknown"}`,
    `Format: ${payload.summary.format || payload.workshop.attendanceMode || "unknown"}`,
    `Submitted: ${payload.submittedAtHkt || payload.submittedAt || "Unknown"}`,
  ];
  if (payload.applicant.email) lines.push(`Email: ${payload.applicant.email}`);
  if (payload.applicant.phone) lines.push(`Phone: ${payload.applicant.phone}`);
  return lines.join("\n");
}

function _buildProteinWorkshopAlertPayload(registrationId, registration) {
  const attendanceMode = _normalizeAttendanceMode(registration.attendanceMode);
  const submittedAt = _toIsoString(registration.applicationSubmittedAt);
  const submittedAtHkt = _toHongKongDateTime(registration.applicationSubmittedAt);
  const applicantPhone = _cleanText(registration.whatsapp || registration.phone, 80);
  const workshopDate = _cleanText(registration.workshopDate, 120);
  const workshopTime = _cleanText(registration.workshopTime, 120);
  const summaryWhen = [workshopDate, workshopTime].filter(Boolean).join(" ").trim();
  const payload = {
    version: 1,
    eventType: "workshop_application_confirmed",
    source: "confirmPaymentUpload",
    id: registrationId,
    registrationId,
    status: _cleanText(registration.status || "pending", 40),
    submittedAt,
    submittedAtHkt,
    applicant: {
      name: _cleanText(registration.name, 200),
      email: _cleanText(registration.userEmail || registration.email, 200),
      phone: applicantPhone,
      whatsapp: applicantPhone,
      ageGroup: _cleanText(registration.ageGroup, 80),
      jobType: _cleanText(registration.jobType, 120),
    },
    workshop: {
      id: _cleanText(registration.workshopId, 120),
      title: _cleanText(registration.workshopTitle, 200),
      date: workshopDate,
      time: workshopTime,
      attendanceMode,
      selectedRound: _cleanText(registration.selectedRound, 120),
      selectedRoundLabel: _cleanText(registration.selectedRoundLabel, 200),
      allSessionDates: Array.isArray(registration.allSessionDates)
        ? registration.allSessionDates.slice(0, 20).map((session) => ({
            date: _cleanText(session && session.date, 120),
            time: _cleanText(session && session.time, 120),
            label: _cleanText(session && session.label, 200),
          }))
        : [],
    },
    payment: {
      screenshotUrl: _cleanText(registration.paymentScreenshotUrl, 1000),
      pricePaid: _cleanText(registration.pricePaid, 80),
      discountApplied: !!registration.discountApplied,
      promoCode: _cleanText(registration.promoCode, 80),
    },
    summary: {
      who: _cleanText(registration.name || registration.userEmail || applicantPhone || registrationId, 200),
      what: _cleanText(registration.workshopTitle || registration.workshopId, 200),
      when: summaryWhen || submittedAtHkt || submittedAt,
      format: attendanceMode,
    },
    // Keep key legacy fields at the root so older booking receivers can
    // continue reading the event while Protein switches to the nested schema.
    name: _cleanText(registration.name, 200),
    userEmail: _cleanText(registration.userEmail || registration.email, 200),
    phone: applicantPhone,
    whatsapp: applicantPhone,
    workshopId: _cleanText(registration.workshopId, 120),
    workshopTitle: _cleanText(registration.workshopTitle, 200),
    workshopDate: workshopDate,
    workshopTime: workshopTime,
    attendanceMode,
    paymentScreenshotUrl: _cleanText(registration.paymentScreenshotUrl, 1000),
    applicationSubmittedAt: submittedAt,
    selectedRound: _cleanText(registration.selectedRound, 120),
    selectedRoundLabel: _cleanText(registration.selectedRoundLabel, 200),
    pricePaid: _cleanText(registration.pricePaid, 80),
  };
  payload.adminBrief = _buildProteinWorkshopAdminBrief(payload);
  return payload;
}

function _combineWorkshopDateTime(reg) {
  const d = _cleanText(reg && reg.workshopDate, 120);
  const t = _cleanText(reg && reg.workshopTime, 80);
  if (d && t) return `${d} ${t}`.trim();
  return (d || t || "").trim();
}

function _registrationTimestampsToIso(reg) {
  if (!reg || typeof reg !== "object") return {};
  const out = { ...reg };
  Object.keys(out).forEach((k) => {
    const v = out[k];
    if (v && typeof v.toDate === "function") {
      try {
        const d = v.toDate();
        out[k] = d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
      } catch (e) {
        delete out[k];
      }
    }
  });
  return out;
}

async function _computeSimpleWebhookExtras(registration) {
  const workshopDateTime = _combineWorkshopDateTime(registration);
  const pricePaid = _cleanText(registration && registration.pricePaid, 80);
  const workshopId = _cleanText(registration && registration.workshopId, 120);
  const sum = await _computeEnrollmentCapacitySummary(workshopId, registration);
  const extras = {
    workshopDateTime,
    pricePaid,
    enrollmentCurrent: sum.enrolled,
    enrollmentCapacity: sum.capacity,
    enrollmentLabel: sum.label,
    enrollmentScope: sum.scope,
  };
  if (sum.roundId) extras.enrollmentRoundId = sum.roundId;
  if (sum.roundLabel) extras.enrollmentRoundLabel = sum.roundLabel;
  if (sum.sessionId) extras.enrollmentSessionId = sum.sessionId;
  return extras;
}

/**
 * Legacy/simple integration: JSON POST only, no HMAC. Receiver must be trusted (your OpenClaw route).
 * @param {Record<string, unknown>} extras Merged last — adds workshopDateTime, pricePaid, enrollment* fields.
 */
async function _sendSimpleBookingWebhook(registrationId, reg, extras = {}) {
  const url = (SIMPLE_BOOKING_WEBHOOK_URL || "").trim();
  if (!url) {
    return { sent: false, skipped: true, reason: "simple-url-not-configured" };
  }
  const safeReg = _registrationTimestampsToIso(reg);
  let body;
  try {
    body = JSON.stringify({ id: registrationId, ...safeReg, ...extras });
  } catch (e) {
    body = JSON.stringify({ id: registrationId, error: "serialization_failed" });
  }
  try {
    console.log("Sending webhook to:", url);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "1",
        "x-webhook-secret": "protein-workshop-secret-2026",
      },
      body,
    });
    const text = await response.text().catch(() => "");
    if (!response.ok) {
      console.error("confirmPaymentUpload simple booking webhook failed", {
        registrationId,
        status: response.status,
        body: text.slice(0, 500),
      });
      return { sent: false, skipped: false, status: response.status };
    }
    console.log("confirmPaymentUpload simple booking webhook sent", { registrationId, status: response.status });
    return { sent: true, skipped: false, status: response.status };
  } catch (err) {
    const cause = err && err.cause ? err.cause : null;
    console.error("confirmPaymentUpload simple booking webhook error", {
      registrationId,
      message: err && err.message ? err.message : String(err),
      causeMessage: cause && cause.message ? cause.message : "",
      causeCode: cause && cause.code ? cause.code : "",
    });
    return { sent: false, skipped: false, reason: "request-error" };
  }
}

async function _sendProteinWorkshopWebhook(payload) {
  const configuredUrl = (proteinWorkshopWebhookUrl.value() || "").trim();
  const webhookUrl = configuredUrl || DEFAULT_PROTEIN_WORKSHOP_WEBHOOK_URL;
  const webhookSecret = (proteinWorkshopWebhookSecret.value() || "").trim();

  if (!webhookUrl) {
    console.warn("confirmPaymentUpload Protein webhook skipped: missing webhook URL", {
      registrationId: payload.registrationId,
    });
    return { sent: false, skipped: true, reason: "missing-url" };
  }
  if (!webhookSecret) {
    console.warn("confirmPaymentUpload Protein webhook skipped: missing webhook secret", {
      registrationId: payload.registrationId,
    });
    return { sent: false, skipped: true, reason: "missing-secret" };
  }

  const body = JSON.stringify(payload);
  const timestamp = new Date().toISOString();
  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-aiflowtime-event": payload.eventType,
        "x-aiflowtime-registration-id": payload.registrationId,
        "x-aiflowtime-signature": signature,
        "x-aiflowtime-timestamp": timestamp,
      },
      body,
    });
    const text = await response.text().catch(() => "");
    if (!response.ok) {
      console.error("confirmPaymentUpload Protein webhook failed", {
        registrationId: payload.registrationId,
        status: response.status,
        body: text.slice(0, 500),
      });
      return { sent: false, skipped: false, status: response.status };
    }
    console.log("confirmPaymentUpload Protein webhook sent", {
      registrationId: payload.registrationId,
      status: response.status,
    });
    return { sent: true, skipped: false, status: response.status };
  } catch (err) {
    const cause = err && err.cause ? err.cause : null;
    console.error("confirmPaymentUpload Protein webhook error", {
      registrationId: payload.registrationId,
      message: err && err.message ? err.message : String(err),
      causeMessage: cause && cause.message ? cause.message : cause ? String(cause) : "",
      causeCode: cause && cause.code ? cause.code : "",
      causeErrno: cause && typeof cause.errno === "number" ? cause.errno : "",
      stack: err && err.stack ? String(err.stack).split("\n").slice(0, 6).join(" | ") : "",
    });
    return { sent: false, skipped: false, reason: "request-error" };
  }
}

/**
 * Optional admin alert via Twilio WhatsApp API.
 * Secret WORKSHOP_WHATSAPP_ALERT_JSON: {"accountSid","authToken","from","to"} — values use whatsapp:+E164 prefixes.
 */
async function _sendTwilioWhatsAppEnrollmentAlert(payload) {
  let cfg = {};
  try {
    cfg = JSON.parse((workshopWhatsAppAlertJson.value() || "{}").trim() || "{}");
  } catch (e) {
    return { sent: false, skipped: true, reason: "twilio-json-invalid" };
  }
  const sid = (cfg.accountSid || "").trim();
  const token = (cfg.authToken || "").trim();
  const from = (cfg.from || "").trim();
  const to = (cfg.to || "").trim();
  if (!sid || !token || !from || !to) {
    return { sent: false, skipped: true, reason: "twilio-not-configured" };
  }
  const brief = payload.adminBrief || _buildProteinWorkshopAdminBrief(payload);
  const bodyStr = brief.length > 1550 ? brief.slice(0, 1547) + "..." : brief;
  const params = new URLSearchParams();
  params.set("To", to);
  params.set("From", from);
  params.set("Body", bodyStr);
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: params.toString(),
    });
    const txt = await res.text().catch(() => "");
    if (!res.ok) {
      console.error("confirmPaymentUpload Twilio WhatsApp failed", {
        registrationId: payload.registrationId,
        status: res.status,
        body: txt.slice(0, 500),
      });
      return { sent: false, skipped: false, status: res.status };
    }
    console.log("confirmPaymentUpload Twilio WhatsApp sent", {
      registrationId: payload.registrationId,
      status: res.status,
    });
    return { sent: true, skipped: false, status: res.status };
  } catch (err) {
    console.error("confirmPaymentUpload Twilio WhatsApp error", {
      registrationId: payload.registrationId,
      message: err && err.message ? err.message : String(err),
    });
    return { sent: false, skipped: false, reason: "request-error" };
  }
}

/**
 * Protein booking webhook is now sent from confirmPaymentUpload when user clicks "確認報名"
 * (confirm apply after uploading payment proof). No longer triggered on document create.
 */
function isEnrolledStatus(reg) {
  const t = ((reg && reg.status) || "pending").toString().toLowerCase();
  if (t === "confirmed") return true;
  if (t !== "pending") return false;
  return !!(
    reg &&
    reg.paymentScreenshotUrl &&
    (
      reg.applicationSubmittedAt ||
      reg._enrollmentCounted === true
    )
  );
}

function sortSessions(sessions) {
  if (!sessions || sessions.length <= 1) return sessions || [];
  return sessions.slice().sort((a, b) => {
    const da = (a.date || "").replace(/[年月]/g, "-").replace(/日/g, "");
    const db = (b.date || "").replace(/[年月]/g, "-").replace(/日/g, "");
    if (da !== db) return da < db ? -1 : 1;
    const ta = (a.time || "").replace(/[^0-9:]/g, "");
    const tb = (b.time || "").replace(/[^0-9:]/g, "");
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });
}

function sessionStableId(s, fallbackIdx) {
  if (s && s.id && s.id.indexOf("session_") === 0 && !/^session_\d+$/.test(s.id)) return s.id;
  const d = (s && s.date || "").replace(/[年月]/g, "-").replace(/日.*/, "").replace(/\s/g, "");
  const t = (s && s.time || "").replace(/[^0-9:]/g, "");
  if (d || t) return "session_" + d + (t ? "_" + t : "");
  return "session_" + (fallbackIdx !== undefined ? fallbackIdx : 0);
}

/**
 * Remove derived enrollment fields before comparing workshop structure changes.
 */
function stripWorkshopEnrollmentFields(workshop) {
  if (!workshop) return null;
  const copy = JSON.parse(JSON.stringify(workshop));
  delete copy.enrolled;
  if (Array.isArray(copy.sessions)) {
    copy.sessions = copy.sessions.map((session) => {
      const next = { ...session };
      delete next.enrolled;
      return next;
    });
  }
  if (Array.isArray(copy.rounds)) {
    copy.rounds = copy.rounds.map((round) => {
      const next = { ...round };
      delete next.enrolled;
      if (Array.isArray(next.sessions)) {
        next.sessions = next.sessions.map((session) => {
          const nextSession = { ...session };
          delete nextSession.enrolled;
          return nextSession;
        });
      }
      return next;
    });
  }
  return copy;
}

function sameRoundCounters(currentRounds, nextRounds) {
  const current = Array.isArray(currentRounds) ? currentRounds : [];
  const next = Array.isArray(nextRounds) ? nextRounds : [];
  if (current.length !== next.length) return false;
  for (let i = 0; i < current.length; i++) {
    const currentId = current[i] && current[i].id ? current[i].id : "";
    const nextId = next[i] && next[i].id ? next[i].id : "";
    if (currentId !== nextId) return false;
    if ((current[i] && current[i].enrolled || 0) !== (next[i] && next[i].enrolled || 0)) return false;
    if ((current[i] && current[i].onlineEnrolled || 0) !== (next[i] && next[i].onlineEnrolled || 0)) return false;
    if ((current[i] && current[i].offlineEnrolled || 0) !== (next[i] && next[i].offlineEnrolled || 0)) return false;
  }
  return true;
}

function sameSessionCounters(currentSessions, nextSessions) {
  const current = sortSessions(currentSessions || []).map((session, index) => ({
    id: session.id || sessionStableId(session, index),
    enrolled: session.enrolled || 0,
    onlineEnrolled: session.onlineEnrolled || 0,
    offlineEnrolled: session.offlineEnrolled || 0,
  }));
  const next = sortSessions(nextSessions || []).map((session, index) => ({
    id: session.id || sessionStableId(session, index),
    enrolled: session.enrolled || 0,
    onlineEnrolled: session.onlineEnrolled || 0,
    offlineEnrolled: session.offlineEnrolled || 0,
  }));
  if (current.length !== next.length) return false;
  for (let i = 0; i < current.length; i++) {
    if (current[i].id !== next[i].id) return false;
    if (current[i].enrolled !== next[i].enrolled) return false;
    if (current[i].onlineEnrolled !== next[i].onlineEnrolled) return false;
    if (current[i].offlineEnrolled !== next[i].offlineEnrolled) return false;
  }
  return true;
}

function resolveLegacySessionMatch(registration, sortedSessions) {
  if (!registration || !Array.isArray(sortedSessions) || !sortedSessions.length) return null;

  const stableIds = {};
  sortedSessions.forEach((session, index) => {
    const sid = session.id || sessionStableId(session, index);
    session.id = sid;
    stableIds[sid] = true;
  });

  const selectedRound = registration.selectedRound || "";
  if (selectedRound && stableIds[selectedRound]) {
    return sortedSessions.find((session) => session.id === selectedRound) || null;
  }

  const label = registration.selectedRoundLabel || "";
  if (label) {
    for (const session of sortedSessions) {
      const sessionLabel = session.label || "";
      if (!sessionLabel) continue;
      if (label === sessionLabel || label.indexOf(sessionLabel) === 0 || sessionLabel.indexOf(label) === 0) return session;
    }
    for (const session of sortedSessions) {
      if (session.date && label.indexOf(session.date) === 0) return session;
    }
  }

  const workshopDate = registration.workshopDate || "";
  if (workshopDate) {
    for (const session of sortedSessions) {
      if (session.date && session.date.indexOf(workshopDate) !== -1) return session;
    }
  }

  if (Array.isArray(registration.allSessionDates) && registration.allSessionDates.length === 1) {
    const singleDate = registration.allSessionDates[0] && registration.allSessionDates[0].date || "";
    if (singleDate) {
      for (const session of sortedSessions) {
        if (session.date && session.date.indexOf(singleDate) !== -1) return session;
      }
    }
  }

  return null;
}

function normalizedDateTimeKey(dateStr, timeStr) {
  const rawDate = (dateStr || "").toString();
  const rawTime = (timeStr || "").toString().replace(/[^0-9:]/g, "");
  const match = rawDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (match) {
    return [match[2], match[3], rawTime].join("|");
  }
  const numeric = rawDate.replace(/[^\d]/g, " ");
  const parts = numeric.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 3) {
    return [parts[1], parts[2], rawTime].join("|");
  }
  return [rawDate.replace(/\s+/g, ""), rawTime].join("|");
}

function resolveLegacyRoundMatch(registration, rounds) {
  if (!registration || !Array.isArray(rounds) || !rounds.length) return null;

  const selectedRound = registration.selectedRound || "";
  if (selectedRound) {
    for (const round of rounds) {
      const roundId = round.id || "";
      if (roundId && roundId === selectedRound) return round;
    }
  }

  const label = registration.selectedRoundLabel || "";
  if (label) {
    for (const round of rounds) {
      const roundLabel = round.label || round.id || "";
      if (!roundLabel) continue;
      if (label === roundLabel || label.indexOf(roundLabel) === 0 || roundLabel.indexOf(label) === 0) return round;
    }
    for (const round of rounds) {
      const sessions = Array.isArray(round.sessions) ? round.sessions : [];
      for (const session of sessions) {
        if (!session.date) continue;
        if (label.indexOf(session.date) === 0 || session.date.indexOf(label) === 0) return round;
      }
    }
  }

  const workshopDate = registration.workshopDate || "";
  if (workshopDate) {
    for (const round of rounds) {
      const sessions = Array.isArray(round.sessions) ? round.sessions : [];
      for (const session of sessions) {
        if (session.date && session.date.indexOf(workshopDate) !== -1) return round;
      }
    }
  }

  const workshopDateKey = normalizedDateTimeKey(registration.workshopDate || "", registration.workshopTime || "");
  if (workshopDateKey) {
    for (const round of rounds) {
      const sessions = Array.isArray(round.sessions) ? round.sessions : [];
      for (const session of sessions) {
        if (normalizedDateTimeKey(session.date || "", session.time || "") === workshopDateKey) return round;
      }
    }
  }

  if (Array.isArray(registration.allSessionDates) && registration.allSessionDates.length) {
    for (const dateEntry of registration.allSessionDates) {
      const singleDate = (dateEntry && dateEntry.date) || "";
      if (!singleDate) continue;
      for (const round of rounds) {
        const sessions = Array.isArray(round.sessions) ? round.sessions : [];
        for (const session of sessions) {
          if (session.date && session.date.indexOf(singleDate) !== -1) return round;
          if (normalizedDateTimeKey(session.date || "", session.time || "") === normalizedDateTimeKey(singleDate, (dateEntry && dateEntry.time) || "")) return round;
        }
      }
    }
  }

  return null;
}

async function recomputeWorkshopEnrollmentCounts(workshopId) {
  if (!workshopId) return false;

  const workshopRef = db.collection("workshops").doc(workshopId);
  const [workshopSnap, regsSnap] = await Promise.all([
    workshopRef.get(),
    db.collection("registrations").where("workshopId", "==", workshopId).get(),
  ]);
  if (!workshopSnap.exists) return false;

  const workshop = workshopSnap.data();
  const enrolled = [];
  regsSnap.forEach((doc) => {
    const reg = doc.data();
    reg._id = doc.id;
    if (isEnrolledStatus(reg)) enrolled.push(reg);
  });

  const updateData = { enrolled: enrolled.length };
  const registrationNormalizations = [];

  if (workshop.courseType === "continuous" && Array.isArray(workshop.rounds) && workshop.rounds.length) {
    const perRound = {};
    const perRoundOnline = {};
    const perRoundOffline = {};
    workshop.rounds.forEach((round) => {
      const rid = round.id || round;
      perRound[rid] = 0;
      perRoundOnline[rid] = 0;
      perRoundOffline[rid] = 0;
    });
    enrolled.forEach((reg) => {
      const matchedRound = resolveLegacyRoundMatch(reg, workshop.rounds);
      if (!matchedRound) return;

      const roundId = matchedRound.id || matchedRound;
      if (perRound[roundId] !== undefined) perRound[roundId]++;

      const attMode = reg.attendanceMode || "";
      if (attMode === "online") { perRoundOnline[roundId] = (perRoundOnline[roundId] || 0) + 1; }
      else if (attMode === "offline") { perRoundOffline[roundId] = (perRoundOffline[roundId] || 0) + 1; }
      else {
        const rMode = (matchedRound.sessions && matchedRound.sessions[0] && matchedRound.sessions[0].mode) || "offline";
        if (rMode === "online") perRoundOnline[roundId] = (perRoundOnline[roundId] || 0) + 1;
        else perRoundOffline[roundId] = (perRoundOffline[roundId] || 0) + 1;
      }

      if (reg._id && roundId && roundId !== (reg.selectedRound || "")) {
        registrationNormalizations.push(
          db.collection("registrations").doc(reg._id).update({ selectedRound: roundId }).catch((err) => {
            console.error("Legacy round normalization failed for " + reg._id + ":", err);
          })
        );
      }
    });
    updateData.rounds = workshop.rounds.map((round) => {
      const id = round.id || round;
      return { ...round, enrolled: perRound[id] ?? 0, onlineEnrolled: perRoundOnline[id] ?? 0, offlineEnrolled: perRoundOffline[id] ?? 0 };
    });
  } else if (Array.isArray(workshop.sessions) && workshop.sessions.length > 1) {
    const sortedSessions = sortSessions(workshop.sessions);
    const perSession = {};
    const perSessionOnline = {};
    const perSessionOffline = {};
    sortedSessions.forEach((session, index) => {
      if (!session.id) session.id = sessionStableId(session, index);
      perSession[session.id] = 0;
      perSessionOnline[session.id] = 0;
      perSessionOffline[session.id] = 0;
    });
    enrolled.forEach((reg) => {
      const matchedSession = resolveLegacySessionMatch(reg, sortedSessions);
      if (!matchedSession) return;
      perSession[matchedSession.id] = (perSession[matchedSession.id] || 0) + 1;

      const attMode = reg.attendanceMode || "";
      if (attMode === "online") { perSessionOnline[matchedSession.id] = (perSessionOnline[matchedSession.id] || 0) + 1; }
      else if (attMode === "offline") { perSessionOffline[matchedSession.id] = (perSessionOffline[matchedSession.id] || 0) + 1; }
      else {
        const sMode = matchedSession.mode || "offline";
        if (sMode === "online") perSessionOnline[matchedSession.id] = (perSessionOnline[matchedSession.id] || 0) + 1;
        else perSessionOffline[matchedSession.id] = (perSessionOffline[matchedSession.id] || 0) + 1;
      }

      if (reg._id && matchedSession.id !== (reg.selectedRound || "")) {
        registrationNormalizations.push(
          db.collection("registrations").doc(reg._id).update({ selectedRound: matchedSession.id }).catch((err) => {
            console.error("Legacy selectedRound normalization failed for", reg._id, err);
          })
        );
      }
    });
    updateData.sessions = sortedSessions.map((session) => ({
      ...session,
      enrolled: perSession[session.id] ?? 0,
      onlineEnrolled: perSessionOnline[session.id] ?? 0,
      offlineEnrolled: perSessionOffline[session.id] ?? 0,
    }));
  }

  if (registrationNormalizations.length) {
    await Promise.all(registrationNormalizations);
  }

  let hasChanges = (workshop.enrolled || 0) !== updateData.enrolled;
  if (!hasChanges && updateData.rounds) {
    hasChanges = !sameRoundCounters(workshop.rounds || [], updateData.rounds);
  }
  if (!hasChanges && updateData.sessions) {
    hasChanges = !sameSessionCounters(workshop.sessions || [], updateData.sessions);
  }
  if (!hasChanges) return false;

  await workshopRef.update(updateData);
  return true;
}

async function inspectWorkshopEnrollmentMapping(workshopId) {
  const workshopRef = db.collection("workshops").doc(workshopId);
  const [workshopSnap, regsSnap] = await Promise.all([
    workshopRef.get(),
    db.collection("registrations").where("workshopId", "==", workshopId).get(),
  ]);
  if (!workshopSnap.exists) {
    throw new HttpsError("not-found", "Workshop not found");
  }

  const workshop = workshopSnap.data();
  const registrations = [];
  regsSnap.forEach((doc) => {
    const reg = doc.data();
    reg._id = doc.id;
    registrations.push(reg);
  });

  const enrolledRegs = registrations.filter((reg) => isEnrolledStatus(reg));
  const summary = {
    workshopId,
    courseType: workshop.courseType || "single",
    totalRegistrations: registrations.length,
    countedRegistrations: enrolledRegs.length,
    workshopEnrolled: workshop.enrolled || 0,
    sessions: [],
    computedSessions: [],
    rounds: [],
    computedRounds: [],
    computedEnrolled: enrolledRegs.length,
    unmatchedSamples: [],
    selectedRoundCounts: {},
    selectedRoundLabelCounts: {},
    workshopDateCounts: {},
  };

  if (workshop.courseType === "continuous" && Array.isArray(workshop.rounds) && workshop.rounds.length) {
    const perRound = {};
    workshop.rounds.forEach((round) => {
      const roundId = round.id || "";
      perRound[roundId] = 0;
      summary.rounds.push({
        id: roundId,
        label: round.label || "",
        enrolled: round.enrolled || 0,
        capacity: round.capacity || 0,
      });
    });

    enrolledRegs.forEach((reg) => {
      const matchedRound = resolveLegacyRoundMatch(reg, workshop.rounds);
      if (!matchedRound) {
        if (summary.unmatchedSamples.length < 10) {
          summary.unmatchedSamples.push({
            regId: reg._id,
            status: reg.status || "",
            selectedRound: reg.selectedRound || "",
            selectedRoundLabel: reg.selectedRoundLabel || "",
            workshopDate: reg.workshopDate || "",
            workshopTime: reg.workshopTime || "",
            allSessionDates: reg.allSessionDates || [],
          });
        }
      } else {
        const roundId = matchedRound.id || "";
        perRound[roundId] = (perRound[roundId] || 0) + 1;
      }
      const sr = reg.selectedRound || "";
      const srl = reg.selectedRoundLabel || "";
      const wd = (reg.workshopDate || "") + ((reg.workshopTime || "") ? (" " + reg.workshopTime) : "");
      summary.selectedRoundCounts[sr] = (summary.selectedRoundCounts[sr] || 0) + 1;
      summary.selectedRoundLabelCounts[srl] = (summary.selectedRoundLabelCounts[srl] || 0) + 1;
      summary.workshopDateCounts[wd] = (summary.workshopDateCounts[wd] || 0) + 1;
    });

    summary.computedRounds = workshop.rounds.map((round) => ({
      id: round.id || "",
      label: round.label || "",
      enrolled: perRound[round.id || ""] || 0,
      capacity: round.capacity || 0,
    }));
  } else if (Array.isArray(workshop.sessions) && workshop.sessions.length) {
    const sortedSessions = sortSessions(workshop.sessions);
    const perSession = {};
    sortedSessions.forEach((session, index) => {
      if (!session.id) session.id = sessionStableId(session, index);
      perSession[session.id] = 0;
      summary.sessions.push({
        id: session.id,
        label: session.label || "",
        date: session.date || "",
        time: session.time || "",
        enrolled: session.enrolled || 0,
        capacity: session.capacity || 0,
      });
    });

    enrolledRegs.forEach((reg) => {
      const matchedSession = resolveLegacySessionMatch(reg, sortedSessions);
      if (!matchedSession) {
        if (summary.unmatchedSamples.length < 10) {
          summary.unmatchedSamples.push({
            regId: reg._id,
            status: reg.status || "",
            selectedRound: reg.selectedRound || "",
            selectedRoundLabel: reg.selectedRoundLabel || "",
            workshopDate: reg.workshopDate || "",
            workshopTime: reg.workshopTime || "",
            allSessionDates: reg.allSessionDates || [],
          });
        }
      } else {
        perSession[matchedSession.id] = (perSession[matchedSession.id] || 0) + 1;
      }
      const sr = reg.selectedRound || "";
      const srl = reg.selectedRoundLabel || "";
      const wd = (reg.workshopDate || "") + ((reg.workshopTime || "") ? (" " + reg.workshopTime) : "");
      summary.selectedRoundCounts[sr] = (summary.selectedRoundCounts[sr] || 0) + 1;
      summary.selectedRoundLabelCounts[srl] = (summary.selectedRoundLabelCounts[srl] || 0) + 1;
      summary.workshopDateCounts[wd] = (summary.workshopDateCounts[wd] || 0) + 1;
    });
    summary.computedSessions = sortedSessions.map((session) => ({
      id: session.id,
      label: session.label || "",
      date: session.date || "",
      time: session.time || "",
      enrolled: perSession[session.id] || 0,
      capacity: session.capacity || 0,
    }));
  }

  return summary;
}

/**
 * Live enrolled vs capacity for the applicant's session/round or whole workshop (matches recompute logic).
 */
async function _computeEnrollmentCapacitySummary(workshopId, registration) {
  if (!workshopId || workshopId === "webhook-test") {
    return { enrolled: 0, capacity: 0, label: "0/0", scope: "none" };
  }
  const workshopRef = db.collection("workshops").doc(workshopId);
  const [workshopSnap, regsSnap] = await Promise.all([
    workshopRef.get(),
    db.collection("registrations").where("workshopId", "==", workshopId).get(),
  ]);
  if (!workshopSnap.exists) {
    return { enrolled: 0, capacity: 0, label: "0/0", scope: "unknown" };
  }
  const workshop = workshopSnap.data();
  const enrolledRegs = [];
  regsSnap.forEach((doc) => {
    const r = doc.data();
    r._id = doc.id;
    if (isEnrolledStatus(r)) enrolledRegs.push(r);
  });
  const totalEnrolled = enrolledRegs.length;

  if (workshop.courseType === "continuous" && Array.isArray(workshop.rounds) && workshop.rounds.length) {
    const matchedRound = resolveLegacyRoundMatch(registration, workshop.rounds);
    const perRound = {};
    workshop.rounds.forEach((round) => {
      const rid = round.id || round;
      if (rid) perRound[rid] = 0;
    });
    enrolledRegs.forEach((r) => {
      const m = resolveLegacyRoundMatch(r, workshop.rounds);
      const rid = m && (m.id || m) ? m.id || m : "";
      if (rid && perRound[rid] !== undefined) perRound[rid] += 1;
    });
    if (matchedRound) {
      const roundId = matchedRound.id || matchedRound;
      const cap = matchedRound.capacity || 0;
      const en = perRound[roundId] || 0;
      return {
        enrolled: en,
        capacity: cap,
        label: `${en}/${cap}`,
        scope: "round",
        roundId: _cleanText(roundId, 120),
        roundLabel: _cleanText(matchedRound.label, 200),
      };
    }
    const capSum = workshop.rounds.reduce((s, round) => s + (round.capacity || 0), 0);
    const cap = capSum || workshop.capacity || 0;
    return { enrolled: totalEnrolled, capacity: cap, label: `${totalEnrolled}/${cap}`, scope: "workshop" };
  }

  if (Array.isArray(workshop.sessions) && workshop.sessions.length > 1) {
    const sortedSessions = sortSessions(workshop.sessions);
    sortedSessions.forEach((session, index) => {
      if (!session.id) session.id = sessionStableId(session, index);
    });
    const matchedSession = resolveLegacySessionMatch(registration, sortedSessions);
    const perSession = {};
    sortedSessions.forEach((s) => {
      perSession[s.id] = 0;
    });
    enrolledRegs.forEach((r) => {
      const m = resolveLegacySessionMatch(r, sortedSessions);
      if (m && m.id) perSession[m.id] = (perSession[m.id] || 0) + 1;
    });
    if (matchedSession && matchedSession.id) {
      const cap =
        matchedSession.capacity !== undefined && matchedSession.capacity !== null
          ? matchedSession.capacity
          : workshop.capacity || 0;
      const en = perSession[matchedSession.id] || 0;
      return {
        enrolled: en,
        capacity: cap,
        label: `${en}/${cap}`,
        scope: "session",
        sessionId: matchedSession.id,
        sessionDate: _cleanText(matchedSession.date, 120),
        sessionTime: _cleanText(matchedSession.time, 80),
      };
    }
    const cap = workshop.capacity || 0;
    return { enrolled: totalEnrolled, capacity: cap, label: `${totalEnrolled}/${cap}`, scope: "workshop" };
  }

  const cap = workshop.capacity || 0;
  return {
    enrolled: totalEnrolled,
    capacity: cap,
    label: `${totalEnrolled}/${cap}`,
    scope: "workshop",
  };
}

async function forceWorkshopEnrollmentSync(workshopId) {
  const workshopRef = db.collection("workshops").doc(workshopId);
  const [workshopSnap, regsSnap] = await Promise.all([
    workshopRef.get(),
    db.collection("registrations").where("workshopId", "==", workshopId).get(),
  ]);
  if (!workshopSnap.exists) {
    throw new HttpsError("not-found", "Workshop not found");
  }

  const workshop = workshopSnap.data();
  const countedRegs = [];
  regsSnap.forEach((doc) => {
    const reg = doc.data();
    reg._id = doc.id;
    if (isEnrolledStatus(reg)) countedRegs.push(reg);
  });

  const updateData = { enrolled: countedRegs.length };
  const normalizationWrites = [];

  if (workshop.courseType === "continuous" && Array.isArray(workshop.rounds) && workshop.rounds.length) {
    const perRound = {};
    workshop.rounds.forEach((round) => {
      perRound[round.id || round] = 0;
    });
    countedRegs.forEach((reg) => {
      const matchedRound = resolveLegacyRoundMatch(reg, workshop.rounds);
      if (!matchedRound) return;
      const roundId = matchedRound.id || matchedRound;
      if (perRound[roundId] !== undefined) perRound[roundId]++;
      if (reg._id && roundId && roundId !== (reg.selectedRound || "")) {
        normalizationWrites.push(
          db.collection("registrations").doc(reg._id).update({ selectedRound: roundId }).catch((err) => {
            console.error("Force round normalization failed for " + reg._id + ":", err);
          })
        );
      }
    });
    updateData.rounds = workshop.rounds.map((round) => {
      const id = round.id || round;
      return { ...round, enrolled: perRound[id] ?? 0 };
    });
  } else if (Array.isArray(workshop.sessions) && workshop.sessions.length > 1) {
    const sortedSessions = sortSessions(workshop.sessions);
    const perSession = {};
    sortedSessions.forEach((session, index) => {
      if (!session.id) session.id = sessionStableId(session, index);
      perSession[session.id] = 0;
    });
    countedRegs.forEach((reg) => {
      const matchedSession = resolveLegacySessionMatch(reg, sortedSessions);
      if (!matchedSession) return;
      perSession[matchedSession.id] = (perSession[matchedSession.id] || 0) + 1;
      if (reg._id && matchedSession.id !== (reg.selectedRound || "")) {
        normalizationWrites.push(
          db.collection("registrations").doc(reg._id).update({ selectedRound: matchedSession.id }).catch((err) => {
            console.error("Force session normalization failed for " + reg._id + ":", err);
          })
        );
      }
    });
    updateData.sessions = sortedSessions.map((session) => ({
      ...session,
      enrolled: perSession[session.id] ?? 0,
    }));
  }

  if (normalizationWrites.length) {
    await Promise.all(normalizationWrites);
  }

  await workshopRef.set(updateData, { merge: true });
  const persistedSnap = await workshopRef.get();
  const persisted = persistedSnap.exists ? persistedSnap.data() : {};
  return {
    written: updateData,
    persisted: {
      enrolled: persisted.enrolled || 0,
      sessions: Array.isArray(persisted.sessions) ? persisted.sessions.map((session, index) => ({
        id: session.id || sessionStableId(session, index),
        label: session.label || "",
        enrolled: session.enrolled || 0,
      })) : [],
      rounds: Array.isArray(persisted.rounds) ? persisted.rounds.map((round) => ({
        id: round.id || "",
        label: round.label || "",
        enrolled: round.enrolled || 0,
      })) : [],
    },
  };
}

/**
 * On any registration write: recompute workshop enrolled (pending + confirmed).
 */
exports.onRegistrationCreated = onDocumentWritten(
  { region: REGION, document: "registrations/{regId}" },
  async (event) => {
    const before = event.data.before.exists ? event.data.before.data() : null;
    const after = event.data.after.exists ? event.data.after.data() : null;
    const workshopIds = new Set();
    if (before && before.workshopId) workshopIds.add(before.workshopId);
    if (after && after.workshopId) workshopIds.add(after.workshopId);
    if (!workshopIds.size) return;

    for (const workshopId of workshopIds) {
      await recomputeWorkshopEnrollmentCounts(workshopId);
    }
  }
);

exports.onWorkshopWritten = onDocumentWritten(
  { region: REGION, document: "workshops/{workshopId}" },
  async (event) => {
    if (!event.data || !event.data.after || !event.data.after.exists) return;
    const workshopId = event.params && event.params.workshopId;
    if (!workshopId) return;

    const analysis = await inspectWorkshopEnrollmentMapping(workshopId);
    let hasMismatch = analysis.computedEnrolled !== analysis.workshopEnrolled;

    if (!hasMismatch && analysis.courseType === "continuous") {
      hasMismatch = !sameRoundCounters(analysis.rounds, analysis.computedRounds);
    } else if (!hasMismatch) {
      hasMismatch = !sameSessionCounters(analysis.sessions, analysis.computedSessions);
    }

    if (!hasMismatch) return;
    await forceWorkshopEnrollmentSync(workshopId);
  }
);

/**
 * One-off repair endpoint to rebuild derived workshop counters from registrations.
 */
exports.repairWorkshopEnrollmentCounts = onCall(
  { region: REGION, cors: true, invoker: "public" },
  async (request) => {
    const workshopId = request.data && request.data.workshopId;
    if (workshopId) {
      const updated = await recomputeWorkshopEnrollmentCounts(workshopId);
      return { success: true, repaired: 1, updated: updated ? 1 : 0 };
    }

    const workshopsSnap = await db.collection("workshops").get();
    let updatedCount = 0;
    for (const doc of workshopsSnap.docs) {
      const updated = await recomputeWorkshopEnrollmentCounts(doc.id);
      if (updated) updatedCount++;
    }
    return { success: true, repaired: workshopsSnap.size, updated: updatedCount };
  }
);

exports.inspectWorkshopEnrollmentMapping = onCall(
  { region: REGION, cors: true, invoker: "public" },
  async (request) => {
    const workshopId = request.data && request.data.workshopId;
    if (!workshopId) {
      throw new HttpsError("invalid-argument", "workshopId is required");
    }
    return await inspectWorkshopEnrollmentMapping(workshopId);
  }
);

exports.forceWorkshopEnrollmentSync = onCall(
  { region: REGION, cors: true, invoker: "public" },
  async (request) => {
    const workshopId = request.data && request.data.workshopId;
    if (!workshopId) {
      throw new HttpsError("invalid-argument", "workshopId is required");
    }
    const result = await forceWorkshopEnrollmentSync(workshopId);
    return { success: true, workshopId, result };
  }
);

exports.inspectRecentRegistrations = onCall(
  { region: REGION, cors: true, invoker: "public" },
  async (request) => {
    const data = request.data || {};
    const limit = Math.max(1, Math.min(Number(data.limit) || 10, 50));
    const workshopId = (data.workshopId || "").toString().trim();
    const userId = (data.userId || "").toString().trim();
    const userEmail = (data.userEmail || "").toString().trim();

    let query = db.collection("registrations");
    if (workshopId) query = query.where("workshopId", "==", workshopId);
    if (userId) query = query.where("userId", "==", userId);
    if (userEmail) query = query.where("userEmail", "==", userEmail);

    const snap = await query.orderBy("createdAt", "desc").limit(limit).get();
    const registrations = snap.docs.map((doc) => {
      const reg = doc.data() || {};
      return {
        id: doc.id,
        workshopId: reg.workshopId || "",
        userId: reg.userId || "",
        userEmail: reg.userEmail || "",
        name: reg.name || "",
        status: reg.status || "",
        selectedRound: reg.selectedRound || "",
        selectedRoundLabel: reg.selectedRoundLabel || "",
        workshopDate: reg.workshopDate || "",
        workshopTime: reg.workshopTime || "",
        hasPaymentScreenshot: !!reg.paymentScreenshotUrl,
        hasApplicationSubmittedAt: !!reg.applicationSubmittedAt,
        createdAt: reg.createdAt || null,
        updatedAt: reg.updatedAt || null,
      };
    });

    return {
      success: true,
      count: registrations.length,
      filters: { workshopId, userId, userEmail, limit },
      registrations,
    };
  }
);

exports.createWebhookTestRegistration = onCall(
  { region: REGION, cors: true, invoker: "public" },
  async () => {
    const now = new Date();
    const ref = db.collection("registrations").doc();
    const payload = {
      workshopId: "webhook-test",
      workshopTitle: "Webhook Test Registration",
      workshopDate: "2099年12月31日（星期四）",
      workshopTime: "23:59",
      selectedRound: "webhook-test-round",
      selectedRoundLabel: "Webhook Test Round",
      attendanceMode: "offline",
      userId: "webhook-test-user",
      userEmail: "webhook-test@aiflowtime.local",
      name: "Webhook Test",
      ageGroup: "25-34",
      phone: "0000 0000",
      jobType: "tech",
      reasons: ["Webhook test"],
      aiProblem: "Testing Protein workshop webhook logs",
      expectation: "Verify trigger and response logs",
      pricePaid: "HK$0",
      discountApplied: false,
      promoCode: "",
      status: "pending",
      paymentScreenshotUrl: "https://example.com/test-payment-proof.png",
      applicationSubmittedAt: null,
      _webhookTest: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      testCreatedAtIso: now.toISOString(),
    };

    await ref.set(payload);
    return {
      success: true,
      id: ref.id,
      workshopId: payload.workshopId,
      userEmail: payload.userEmail,
    };
  }
);

exports.inspectProteinWorkshopWebhook = onRequest(
  {
    region: REGION,
    cors: true,
    secrets: [proteinWorkshopWebhookSecret],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "POST required" });
      return;
    }

    const timestamp = _cleanText(req.get("x-aiflowtime-timestamp"), 80);
    const signature = _cleanText(req.get("x-aiflowtime-signature"), 200);
    const rawBody = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body || {});
    const secret = (proteinWorkshopWebhookSecret.value() || "").trim();
    if (!timestamp || !signature || !rawBody || !secret) {
      res.status(400).json({ ok: false, error: "Missing signature inputs" });
      return;
    }

    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    const actualBuf = Buffer.from(signature, "utf8");
    const expectedBuf = Buffer.from(expected, "utf8");
    if (actualBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(actualBuf, expectedBuf)) {
      res.status(401).json({ ok: false, error: "Invalid signature" });
      return;
    }

    const payload = req.body || {};
    const brief = payload.adminBrief || _buildProteinWorkshopAdminBrief(payload);
    console.log("inspectProteinWorkshopWebhook verified", {
      registrationId: payload.registrationId || payload.id || "",
      eventType: payload.eventType || "",
    });
    res.status(200).json({
      ok: true,
      registrationId: payload.registrationId || payload.id || "",
      eventType: payload.eventType || "",
      format: (payload.summary && payload.summary.format) || payload.attendanceMode || "",
      brief,
    });
  }
);

/**
 * Image/video proxy — serves Firebase Storage through Cloud Functions.
 * iOS Safari requires Accept-Ranges + 206 Partial Content for reliable <video> playback.
 */
function _storageProxyParseRange(rangeHeader, size) {
  if (!rangeHeader || !/^bytes=/i.test(String(rangeHeader))) return null;
  const total = Number(size);
  if (!Number.isFinite(total) || total <= 0) return null;
  const spec = String(rangeHeader).replace(/^bytes=/i, "").trim();
  const dash = spec.indexOf("-");
  if (dash < 0) return null;
  const startRaw = spec.slice(0, dash);
  const endRaw = spec.slice(dash + 1);
  let start;
  let end;
  if (startRaw === "" && endRaw !== "") {
    const suffix = parseInt(endRaw, 10);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, total - suffix);
    end = total - 1;
  } else if (startRaw !== "" && endRaw === "") {
    start = parseInt(startRaw, 10);
    if (!Number.isFinite(start) || start < 0) return null;
    end = total - 1;
  } else if (startRaw !== "" && endRaw !== "") {
    start = parseInt(startRaw, 10);
    end = parseInt(endRaw, 10);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  } else {
    return null;
  }
  if (start > end || start >= total) return null;
  end = Math.min(end, total - 1);
  return { start, end, length: end - start + 1 };
}

exports.storageProxy = onRequest(
  { region: REGION, timeoutSeconds: 120, cors: true },
  async (req, res) => {
    const filePath = req.query.path;
    if (!filePath) {
      res.status(400).send("Missing ?path= parameter");
      return;
    }

    try {
      const bucket = admin.storage().bucket();
      const file = bucket.file(filePath);
      const [exists] = await file.exists();
      if (!exists) {
        res.status(404).send("File not found");
        return;
      }

      const [metadata] = await file.getMetadata();
      const contentType = metadata.contentType || "application/octet-stream";
      const size = Number(metadata.size);
      if (!Number.isFinite(size) || size < 0) {
        res.status(500).send("Invalid file metadata");
        return;
      }

      res.set("Accept-Ranges", "bytes");
      res.set("Cache-Control", "public, max-age=86400");
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length");

      if (req.method === "HEAD") {
        res.set("Content-Type", contentType);
        res.set("Content-Length", String(size));
        res.status(200).end();
        return;
      }

      if (req.method !== "GET") {
        res.status(405).send("Method not allowed");
        return;
      }

      const rangeHeader = req.get("range") || req.get("Range");
      const parsed = rangeHeader ? _storageProxyParseRange(rangeHeader, size) : null;
      if (rangeHeader && parsed == null) {
        res.status(416);
        res.set("Content-Range", `bytes */${size}`);
        res.end("Range Not Satisfiable");
        return;
      }

      if (parsed) {
        res.status(206);
        res.set("Content-Range", `bytes ${parsed.start}-${parsed.end}/${size}`);
        res.set("Content-Length", String(parsed.length));
        res.set("Content-Type", contentType);
        file
          .createReadStream({ start: parsed.start, end: parsed.end })
          .on("error", (streamErr) => {
            console.error("storageProxy stream error:", streamErr);
            if (!res.headersSent) res.status(500).end();
            else res.destroy(streamErr);
          })
          .pipe(res);
        return;
      }

      res.status(200);
      res.set("Content-Length", String(size));
      res.set("Content-Type", contentType);
      file
        .createReadStream()
        .on("error", (streamErr) => {
          console.error("storageProxy stream error:", streamErr);
          if (!res.headersSent) res.status(500).end();
          else res.destroy(streamErr);
        })
        .pipe(res);
    } catch (err) {
      console.error("storageProxy error:", err);
      if (!res.headersSent) res.status(500).send("Error fetching file");
    }
  }
);

/**
 * Build WhatsApp share URL with correct emoji (server-side avoids browser encoding issues).
 * Callable from client: { phone, name, wsTitle, wsDate, wsTime, wsMode, wsZoomLink, wsLocation, regId, regStatus, fee, notice, template }
 * Returns: { url } full wa.me URL.
 */
const E = { pin: "📌", cal: "📅", clock: "🕐", laptop: "💻", office: "🏢", loc: "📍", link: "🔗", doc: "📄" };
const DEFAULT_CONFIRMED = `Hi {name}！

你已成功報名以下工作坊：

${E.pin} 工作坊：{workshopTitle}
${E.cal} 日期：{date}
${E.clock} 時間：{time}
{mode}
{location}

${E.doc} 收據（直接開啟）：{receiptLink}

如有任何問題，歡迎隨時聯絡我們！`;
const DEFAULT_PENDING = `Hi {name}！

我們已收到你的付款截圖，正在確認中。

${E.pin} 工作坊：{workshopTitle}
${E.cal} 日期：{date}
${E.clock} 時間：{time}

確認後我們會再通知你。如有任何問題，歡迎隨時聯絡我們！`;

function fixWaEmoji(tpl) {
  if (!tpl || typeof tpl !== "string") return tpl;
  const R = "\uFFFD";
  return tpl
    .replace(new RegExp(R + "\\s*工作坊", "g"), E.pin + " 工作坊")
    .replace(new RegExp(R + "\\s*日期", "g"), E.cal + " 日期")
    .replace(new RegExp(R + "\\s*時間", "g"), E.clock + " 時間")
    .replace(new RegExp(R + "\\s*模式", "g"), E.office + " 模式")
    .replace(new RegExp(R + "\\s*地點", "g"), E.loc + " 地點")
    .replace(new RegExp(R + "\\s*費用", "g"), E.pin + " 費用")
    .replace(new RegExp(R + "\\s*收據", "g"), E.doc + " 收據")
    .replace(new RegExp(R + "\\s*線上", "g"), E.link + " 線上")
    .replace(new RegExp(R, "g"), "");
}

exports.buildWhatsAppUrl = onCall(
  { region: REGION, cors: true, invoker: "public" },
  async (request) => {
    const data = request.data || {};
    let phone = (data.phone || "").replace(/[\s\-()]/g, "");
    if (phone.startsWith("+")) phone = phone.slice(1);
    else if (/^\d{8}$/.test(phone)) phone = "852" + phone;
    if (!phone) throw new HttpsError("invalid-argument", "phone is required");

    const name = data.name || "";
    const wsTitle = data.wsTitle || "";
    const wsDate = data.wsDate || "";
    const wsTime = data.wsTime || "";
    const wsMode = data.wsMode || "offline";
    const wsZoomLink = data.wsZoomLink || "";
    const wsLocation = data.wsLocation || "";
    const regId = data.regId || "";
    const regStatus = data.regStatus || "pending";
    const fee = data.fee || "";
    const notice = data.notice || "";
    const templateRaw = data.template || "";
    const isConfirmed = regStatus === "confirmed";

    let tpl = templateRaw ? fixWaEmoji(templateRaw) : (isConfirmed ? DEFAULT_CONFIRMED : DEFAULT_PENDING);
    if (tpl.indexOf("\uFFFD") >= 0) tpl = isConfirmed ? DEFAULT_CONFIRMED : DEFAULT_PENDING;

    let modeText = "";
    if (wsMode === "online") modeText = E.laptop + " 模式：線上";
    else if (wsMode === "both") modeText = E.laptop + " 模式：實體＋線上";
    else modeText = E.office + " 模式：實體";

    let locationText = "";
    if (wsLocation && wsMode !== "online") locationText = E.loc + " 地點：" + wsLocation;
    if (wsZoomLink && (wsMode === "online" || wsMode === "both")) {
      locationText = (locationText ? locationText + "\n" : "") + E.link + " 線上連結：" + wsZoomLink;
    }

    const receiptLink = regId
      ? "https://aiflowtime-hk.web.app/receipt?id=" + regId
      : "https://aiflowtime-hk.web.app/profile";

    let msg = tpl
      .replace(/\{name\}/g, name)
      .replace(/\{workshopTitle\}/g, wsTitle)
      .replace(/\{date\}/g, wsDate)
      .replace(/\{time\}/g, wsTime)
      .replace(/\{mode\}/g, modeText)
      .replace(/\{location\}/g, locationText)
      .replace(/\{fee\}/g, fee)
      .replace(/\{notice\}/g, notice)
      .replace(/\{zoomLink\}/g, wsZoomLink)
      .replace(/\{receiptLink\}/g, receiptLink);

    const url = "https://wa.me/" + phone + "?text=" + encodeURIComponent(msg);
    return { url };
  }
);

/**
 * Scheduled: every 5 minutes, mark pending reservations past expiresAt as expired.
 */
exports.releaseExpiredReservations = onSchedule(
  { region: REGION, schedule: "every 5 minutes", timeoutSeconds: 120 },
  async () => {
    const now = admin.firestore.Timestamp.now();
    const snap = await db
      .collection("reservations")
      .where("status", "==", "pending")
      .where("expiresAt", "<", now)
      .get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { status: "expired" }));
    if (!snap.empty) await batch.commit();
  }
);

function _escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function _cleanText(value, maxLen = 500) {
  return String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function _cleanMultilineText(value, maxLen = 4000) {
  return String(value || "").trim().slice(0, maxLen);
}

function _isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function _base64Url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function _getFreeMaterialMailerConfig() {
  return {
    clientId: (process.env.GMAIL_CLIENT_ID || "").trim(),
    clientSecret: (process.env.GMAIL_CLIENT_SECRET || "").trim(),
    refreshToken: (process.env.GMAIL_REFRESH_TOKEN || "").trim(),
    sender: (process.env.GMAIL_SENDER || "jacobfung@AIFLOWTIME.com").trim(),
    replyTo: (process.env.GMAIL_REPLY_TO || process.env.GMAIL_SENDER || "jacobfung@AIFLOWTIME.com").trim(),
  };
}

function _assertFreeMaterialMailerConfig() {
  const cfg = _getFreeMaterialMailerConfig();
  if (!cfg.clientId || !cfg.clientSecret || !cfg.refreshToken || !cfg.sender) {
    throw new Error("Gmail API credentials are not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, and GMAIL_SENDER.");
  }
  return cfg;
}

function _createGmailClient() {
  const cfg = _assertFreeMaterialMailerConfig();
  const auth = new google.auth.OAuth2(cfg.clientId, cfg.clientSecret);
  auth.setCredentials({ refresh_token: cfg.refreshToken });
  return { gmail: google.gmail({ version: "v1", auth }), cfg };
}

async function _prepareFreeMaterialAsset(pdfUrl, fileName, deliveryMode) {
  const mode = (deliveryMode || "auto").toLowerCase();
  const response = await fetch(pdfUrl, { redirect: "follow" });
  if (!response.ok) {
    throw new Error("Unable to fetch the configured PDF file.");
  }
  const contentType = (response.headers.get("content-type") || "application/pdf").split(";")[0].trim();
  const arr = await response.arrayBuffer();
  const buffer = Buffer.from(arr);
  const safeFileName = _cleanText(fileName || "aiflowtime-free-material.pdf", 120) || "aiflowtime-free-material.pdf";
  const canAttach = mode !== "link" && buffer.length > 0 && buffer.length <= FREE_MATERIAL_ATTACHMENT_LIMIT;
  return {
    downloadUrl: pdfUrl,
    contentType,
    safeFileName,
    attach:
      canAttach && (mode === "attachment" || mode === "auto")
        ? { filename: safeFileName, contentType: contentType || "application/pdf", data: buffer }
        : null,
  };
}

function _buildFreeMaterialHtml({ recipientName, materialTitle, downloadUrl, pageTitle, attachInline }) {
  const safeName = _escapeHtml(recipientName || "there");
  const safeTitle = _escapeHtml(materialTitle || "your material");
  const safePageTitle = _escapeHtml(pageTitle || "AIFlowTime");
  const ctaHtml = downloadUrl
    ? `<p style="margin:28px 0 0;"><a href="${_escapeHtml(downloadUrl)}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:#D97757;color:#ffffff;text-decoration:none;font-weight:700;">Download now</a></p>`
    : "";
  const attachmentNote = attachInline
    ? "<p style=\"margin:16px 0 0;\">The PDF is also attached directly to this email for convenience.</p>"
    : "";
  return `
    <div style="font-family:Arial,sans-serif;background:#f6f2ee;padding:32px 16px;color:#231f20;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:24px;padding:32px;border:1px solid rgba(35,31,32,0.08);">
        <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#D97757;font-weight:700;">AIFLOWTIME</div>
        <h1 style="margin:14px 0 0;font-size:30px;line-height:1.1;">Your free material is ready</h1>
        <p style="margin:16px 0 0;line-height:1.8;">Hi ${safeName}, thanks for requesting <strong>${safeTitle}</strong> from ${safePageTitle}.</p>
        <p style="margin:16px 0 0;line-height:1.8;">You can access it using the button below.</p>
        ${ctaHtml}
        ${attachmentNote}
        <p style="margin:28px 0 0;line-height:1.8;color:rgba(35,31,32,0.72);">If the button does not work, copy and paste this link into your browser:<br>${_escapeHtml(downloadUrl || "")}</p>
      </div>
    </div>
  `;
}

function _buildFreeMaterialEmail({ sender, replyTo, recipient, subject, html, attachment }) {
  const boundary = `aiflowtime-${Date.now()}`;
  const headers = [
    `From: AIFLOWTIME <${sender}>`,
    `To: ${recipient}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
  ];
  let body = "";
  if (attachment) {
    headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    body =
      `--${boundary}\r\n` +
      "Content-Type: text/html; charset=UTF-8\r\n" +
      "Content-Transfer-Encoding: 7bit\r\n\r\n" +
      `${html}\r\n\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${attachment.contentType}; name="${attachment.filename}"\r\n` +
      `Content-Disposition: attachment; filename="${attachment.filename}"\r\n` +
      "Content-Transfer-Encoding: base64\r\n\r\n" +
      `${attachment.data.toString("base64")}\r\n\r\n` +
      `--${boundary}--`;
  } else {
    headers.push("Content-Type: text/html; charset=UTF-8");
    body = html;
  }
  return _base64Url(`${headers.join("\r\n")}\r\n\r\n${body}`);
}

exports.requestFreeMaterialDownload = onRequest(
  { region: REGION, timeoutSeconds: 120, cors: true },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }

    const data = req.body || {};
    const name = _cleanText(data.name, 160);
    const email = _cleanText(data.email, 200).toLowerCase();
    const materialTitle = _cleanText(data.materialTitle || "AIFLOWTIME Free Material", 200);
    const emailSubject = _cleanText(data.emailSubject || `${materialTitle} is ready`, 220);
    const pdfUrl = String(data.pdfUrl || "").trim();
    const fileName = _cleanText(data.fileName || "aiflowtime-free-material.pdf", 160);
    const deliveryMode = _cleanText(data.deliveryMode || "auto", 40).toLowerCase();
    const pageKey = _cleanText(data.pageKey, 120);
    const pagePath = _cleanText(data.pagePath, 240);
    const pageTitle = _cleanText(data.pageTitle, 240);
    const sectionId = _cleanText(data.sectionId, 120);
    const successMessage = _cleanMultilineText(data.successMessage, 500);
    const consentText = _cleanMultilineText(data.consentText, 2000);
    const consentAccepted = !!data.consentAccepted;

    if (!name || !_isValidEmail(email)) {
      res.status(400).json({ ok: false, error: "A valid name and email are required." });
      return;
    }
    if (!pdfUrl) {
      res.status(400).json({ ok: false, error: "This section does not have a PDF URL configured yet." });
      return;
    }
    if (consentText && !consentAccepted) {
      res.status(400).json({ ok: false, error: "Consent is required before sending the material." });
      return;
    }

    const leadRef = db.collection(FREE_MATERIAL_COLLECTION).doc();
    await leadRef.set({
      type: "free-material-download",
      name,
      email,
      materialTitle,
      emailSubject,
      pdfUrl,
      fileName,
      deliveryModeRequested: deliveryMode,
      pageKey,
      pagePath,
      pageTitle,
      sectionId,
      consentText,
      consentAccepted,
      status: "queued",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
      const { gmail, cfg } = _createGmailClient();
      const asset = await _prepareFreeMaterialAsset(pdfUrl, fileName, deliveryMode);
      const html = _buildFreeMaterialHtml({
        recipientName: name,
        materialTitle,
        downloadUrl: asset.downloadUrl,
        pageTitle,
        attachInline: !!asset.attach,
      });
      const raw = _buildFreeMaterialEmail({
        sender: cfg.sender,
        replyTo: cfg.replyTo,
        recipient: email,
        subject: emailSubject,
        html,
        attachment: asset.attach,
      });
      const response = await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw },
      });

      await leadRef.set({
        status: "sent",
        gmailMessageId: response.data && response.data.id ? response.data.id : "",
        deliveryModeResolved: asset.attach ? "attachment" : "link",
        deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      res.status(200).json({
        ok: true,
        message: successMessage || "Your material is on the way. Please check your email.",
      });
    } catch (err) {
      console.error("requestFreeMaterialDownload error:", err);
      await leadRef.set({
        status: "failed",
        errorMessage: _cleanMultilineText(err && err.message ? err.message : String(err), 2000),
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      const message = /credentials are not configured/i.test(String(err && err.message))
        ? "Email delivery is not configured yet. Add the Gmail API credentials and try again."
        : "We couldn't send the material right now. Please try again shortly.";
      res.status(500).json({ ok: false, error: message });
    }
  }
);

/**
 * CMS-managed public page routes.
 *
 * Keep the managed doc/slugs in sync with layout-editor.html:
 * - MANAGED_PUBLIC_PAGE_DEFAULT_SLUGS
 * - RESERVED_SYSTEM_PUBLIC_URL_SLUGS
 */
const MANAGED_PUBLIC_PAGE_ROUTES = {
  "workshop-main": {
    defaultSlug: "ai-beginner-workshop",
    previewTemplateUrl: "/ai-beginner-workshop",
    templatePath: "/ai-beginner-workshop.html",
  },
  "linktree": {
    defaultSlug: "linktree",
    previewTemplateUrl: "/linktree",
    templatePath: "/linktree.html",
  },
  "about-jacob": {
    defaultSlug: "about-jacob",
    previewTemplateUrl: "/about-jacob",
    templatePath: "/about-jacob.html",
  },
  "countdown": {
    defaultSlug: "countdown",
    previewTemplateUrl: "/countdown",
    templatePath: "/countdown.html",
  },
  "consultation": {
    defaultSlug: "consultation",
    previewTemplateUrl: "/consultation",
    templatePath: "/consultation.html",
  },
  "quiz": {
    defaultSlug: "quiz",
    previewTemplateUrl: "/quiz",
    templatePath: "/quiz.html",
  },
  "workshop-c": {
    defaultSlug: "workshop-c",
    previewTemplateUrl: "/workshop-c",
    templatePath: "/workshop-c.html",
  },
  "workshop-0": {
    defaultSlug: "workshop-0",
    previewTemplateUrl: "/workshop-0",
    templatePath: "/Kimi_Agent_AI%20Workshop%20Landing%20Page/index.html",
  },
};

const MANAGED_PUBLIC_DOC_ID_BY_SLUG = Object.keys(MANAGED_PUBLIC_PAGE_ROUTES).reduce((acc, docId) => {
  acc[MANAGED_PUBLIC_PAGE_ROUTES[docId].defaultSlug] = docId;
  return acc;
}, {});

const SYSTEM_RESERVED_PAGE_SLUGS = new Set([
  "ai-guide-2026",
  "workshop-thank-you",
  "workshop-cms",
  "workshop-payment",
  "profile",
  "checkin",
  "receipt",
  "business-cms",
  "layout-editor",
  "qr-display",
  "qr-submit",
  "doc",
  "elevator-action-gb",
  "game-scores-admin",
  "ig-consultation",
  "index",
  "js",
  "css",
  "fonts",
  "img",
  "images",
  "assets",
  "media",
  "extensions",
]);

function _normalizePublicSlug(slug) {
  return String(slug || "").trim().toLowerCase();
}

function _defaultSlugForDocId(docId) {
  const route = MANAGED_PUBLIC_PAGE_ROUTES[String(docId || "").trim()];
  return route ? route.defaultSlug : "";
}

function _normalizePreviewTemplatePath(previewTemplateUrl) {
  let p = String(previewTemplateUrl || "").trim() || "/ai-beginner-workshop";
  try {
    if (p.startsWith("http://") || p.startsWith("https://")) {
      p = new URL(p).pathname || "/ai-beginner-workshop";
    }
  } catch (_) {
    p = "/ai-beginner-workshop";
  }
  if (!p.startsWith("/")) p = `/${p}`;
  if (/\.html$/i.test(p)) p = p.replace(/\.html$/i, "");
  return p;
}

function _normalizePublicPageStatus(status, docId) {
  const raw = String(status || "").trim().toLowerCase();
  if (raw === "archived" && MANAGED_PUBLIC_PAGE_ROUTES[docId]) return "unpublished";
  if (raw === "unpublished") return "unpublished";
  if (raw === "archived") return "archived";
  return "published";
}

function _resolveTemplatePath(docId, data) {
  const route = MANAGED_PUBLIC_PAGE_ROUTES[String(docId || "").trim()];
  if (route && route.templatePath) return route.templatePath;
  const previewTemplateUrl = (data && data.previewTemplateUrl) || (route && route.previewTemplateUrl) || "/ai-beginner-workshop";
  const normalized = _normalizePreviewTemplatePath(previewTemplateUrl);
  if (normalized === "/workshop-0") return MANAGED_PUBLIC_PAGE_ROUTES["workshop-0"].templatePath;
  if (/\/index$/i.test(normalized)) return `${normalized}.html`;
  return `${normalized}.html`;
}

function _templateBaseHref(templatePath) {
  const normalized = String(templatePath || "").trim() || "/";
  const slash = normalized.lastIndexOf("/");
  if (slash <= 0) return "/";
  return normalized.slice(0, slash + 1);
}

function _injectResolvedRouteContext(html, context) {
  const injections = [
    `<base href="${String(context.baseHref || "/").replace(/"/g, "&quot;")}">`,
    context.canonicalHref ? `<link rel="canonical" href="${String(context.canonicalHref).replace(/"/g, "&quot;")}">` : "",
    `<script>window.__AIFLOWTIME_LAYOUT_DOC=${JSON.stringify(context.layoutDoc || "")};window.__AIFLOWTIME_PAGE_SLUG=${JSON.stringify(context.pageSlug || "")};</script>`,
  ].filter(Boolean).join("");
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${injections}`);
  }
  return injections + html;
}

async function _findResolvedPageForSlug(slug) {
  const normalized = _normalizePublicSlug(slug);
  if (!normalized) return null;

  const exactSnap = await db.collection("pageLayouts").where("pageSlug", "==", normalized).limit(2).get();
  if (!exactSnap.empty) {
    if (exactSnap.size > 1) console.warn("resolvePageSlug: multiple docs for canonical slug", normalized);
    return { docId: exactSnap.docs[0].id, data: exactSnap.docs[0].data() || {}, matchType: "canonical" };
  }

  const legacySnap = await db.collection("pageLayouts").where("legacySlugs", "array-contains", normalized).limit(2).get();
  if (!legacySnap.empty) {
    if (legacySnap.size > 1) console.warn("resolvePageSlug: multiple docs for legacy slug", normalized);
    return { docId: legacySnap.docs[0].id, data: legacySnap.docs[0].data() || {}, matchType: "legacy" };
  }

  const managedDocId = MANAGED_PUBLIC_DOC_ID_BY_SLUG[normalized];
  if (!managedDocId) return null;
  const doc = await db.collection("pageLayouts").doc(managedDocId).get();
  return {
    docId: managedDocId,
    data: doc.exists ? (doc.data() || {}) : {},
    matchType: "managed-default",
  };
}

exports.resolvePageSlug = onRequest(
  { region: REGION, timeoutSeconds: 15, cors: false, invoker: "public" },
  async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const host = req.get("x-forwarded-host") || req.get("host") || "localhost";
    const incoming = new URL(req.url || "/", `https://${host}`);
    let pathname = incoming.pathname || "/";
    if (pathname !== "/" && pathname.endsWith("/")) pathname = pathname.replace(/\/+$/, "") || "/";

    const segments = pathname.split("/").filter(Boolean);
    if (segments.length !== 1) {
      res.status(404).send("Not Found");
      return;
    }

    const slug = _normalizePublicSlug(segments[0]);
    if (!slug || !/^[a-z0-9-]+$/.test(slug) || slug.length > 120) {
      res.status(404).send("Not Found");
      return;
    }

    if (SYSTEM_RESERVED_PAGE_SLUGS.has(slug)) {
      res.status(404).send("Not Found");
      return;
    }

    try {
      const resolved = await _findResolvedPageForSlug(slug);
      if (!resolved) {
        res.status(404).send("Not Found");
        return;
      }

      const docId = resolved.docId;
      const data = resolved.data || {};
      const canonicalSlug = _normalizePublicSlug(data.pageSlug) || _defaultSlugForDocId(docId);
      const isPreview = incoming.searchParams.get("preview") === "1";

      if (!canonicalSlug || SYSTEM_RESERVED_PAGE_SLUGS.has(canonicalSlug)) {
        res.status(404).send("Not Found");
        return;
      }

      if (!isPreview && _normalizePublicPageStatus(data.pageStatus, docId) !== "published") {
        res.status(404).send("Not Found");
        return;
      }

      if (slug !== canonicalSlug) {
        const redirectUrl = new URL(`/${canonicalSlug}`, `https://${host}`);
        incoming.searchParams.forEach((value, key) => {
          redirectUrl.searchParams.set(key, value);
        });
        res.redirect(301, `${redirectUrl.pathname}${redirectUrl.search}`);
        return;
      }

      const templatePath = _resolveTemplatePath(docId, data);
      const upstreamUrl = new URL(templatePath, `https://${host}`);
      incoming.searchParams.forEach((value, key) => {
        upstreamUrl.searchParams.set(key, value);
      });

      const upstream = await fetch(upstreamUrl.toString(), {
        method: req.method,
        redirect: "follow",
        cache: "no-store",
      });

      if (!upstream.ok) {
        console.error("resolvePageSlug upstream error", { slug, docId, templatePath, status: upstream.status });
        res.status(upstream.status === 404 ? 404 : 502).send(upstream.status === 404 ? "Not Found" : "Upstream page unavailable");
        return;
      }

      res.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      res.set("Content-Type", upstream.headers.get("content-type") || "text/html; charset=utf-8");

      if (req.method === "HEAD") {
        res.status(200).send("");
        return;
      }

      const html = await upstream.text();
      const body = _injectResolvedRouteContext(html, {
        layoutDoc: docId,
        pageSlug: canonicalSlug,
        canonicalHref: `https://${host}/${canonicalSlug}`,
        baseHref: _templateBaseHref(templatePath),
      });

      res.status(200).send(body);
    } catch (err) {
      console.error("resolvePageSlug error:", err);
      res.status(500).send("Server error");
    }
  }
);

// ----- Carousel OpenClaw webhook (HMAC + template factory; Admin SDK -> carouselProjects) -----
function _ccEsc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function _ccRt(text, opts) {
  opts = opts || {};
  const html = _ccEsc(text).replace(/\n/g, "<br>");
  return {
    html,
    text,
    fontSize: opts.fontSize || 32,
    fontFamily: opts.fontFamily || "Noto Sans TC",
    color: opts.color || "#ffffff",
    bold: !!opts.bold,
    italic: !!opts.italic,
    underline: !!opts.underline,
    strikethrough: !!opts.strikethrough,
  };
}

const _carouselTemplateFactories = {
  titleGold: (payload) => ({
    bg: {
      type: "photo",
      color: "#2a1f0a",
      overlay: 0.45,
      image: "",
      imageX: 50,
      imageY: 50,
      imageFit: "cover",
      imageScale: 100,
    },
    components: [
      { type: "label", data: { text: _ccRt(payload.label || "訊息策略", { fontSize: 24, color: "#c9a84c" }) } },
      {
        type: "heading",
        data: {
          text: _ccRt(payload.headline || payload.heading || "標題", {
            fontSize: 110,
            fontFamily: "Noto Serif TC",
            bold: true,
            color: "#ffffff",
          }),
        },
      },
      {
        type: "body",
        data: { text: _ccRt(payload.body || "內容...", { fontSize: 32, color: "rgba(255,255,255,0.88)" }) },
      },
    ],
  }),

  /** 五連發戰術弧（與 carousel-creator.html 中 ARC5_TEMPLATES 一致；圖片請用 https URL） */
  arcCover: (payload) => {
    const p = payload || {};
    const img = String(p.coverImageUrl || p.imageUrl || "").trim();
    return {
      bg: {
        type: "photo",
        color: "#0a0a0a",
        overlay: 0.52,
        image: img,
        imageX: 50,
        imageY: 50,
        imageFit: "cover",
        imageScale: 100,
      },
      components: [
        { type: "label", data: { text: _ccRt(p.kicker || p.label || "系列標籤", { fontSize: 22, color: "#c9a84c" }) } },
        {
          type: "heading",
          data: {
            text: _ccRt(p.headline || p.heading || "用一行鉤子抓住注意力", {
              fontSize: 100,
              fontFamily: "Noto Serif TC",
              bold: true,
              color: "#ffffff",
            }),
          },
        },
        {
          type: "body",
          data: {
            text: _ccRt(
              p.sub || p.body || "副標：補一句承上啟下",
              { fontSize: 30, color: "rgba(255,255,255,0.88)" }
            ),
          },
        },
      ],
    };
  },

  arcInsight: (payload) => {
    const p = payload || {};
    const img = String(p.imageUrl || "").trim();
    return {
      bg: { type: "photo", color: "#111208", overlay: 0.46, image: "", imageX: 50, imageY: 50, imageFit: "cover", imageScale: 100 },
      components: [
        { type: "label", data: { text: _ccRt(p.label || "論點", { fontSize: 24, color: "#c9a84c" }) } },
        {
          type: "heading",
          data: {
            text: _ccRt(p.headline || p.heading || "中間頁：一個清楚主張", {
              fontSize: 96,
              fontFamily: "Noto Serif TC",
              bold: true,
              color: "#ffffff",
            }),
          },
        },
        {
          type: "body",
          data: {
            text: _ccRt(p.body || "用 2–4 行說清楚「所以怎樣」", {
              fontSize: 30,
              color: "rgba(255,255,255,0.88)",
            }),
          },
        },
        {
          type: "image",
          data: { src: img, width: 78, posX: 50, posY: 50, borderRadius: 12, objectFit: "cover" },
        },
      ],
    };
  },

  arcProof: (payload) => {
    const p = payload || {};
    const img = String(p.imageUrl || "").trim();
    return {
      bg: {
        type: "cream",
        color: "#f5f0e8",
        overlay: 0,
        image: "",
        imageX: 50,
        imageY: 50,
        imageFit: "cover",
        imageScale: 100,
      },
      components: [
        {
          type: "image",
          data: { src: img, width: 92, posX: 50, posY: 50, borderRadius: 14, objectFit: "cover" },
        },
        {
          type: "heading",
          data: {
            text: _ccRt(p.headline || p.heading || "數據、截圖或新聞畫面", {
              fontSize: 88,
              fontFamily: "Noto Serif TC",
              bold: true,
              color: "#2c2416",
            }),
          },
        },
        {
          type: "body",
          data: {
            text: _ccRt(p.body || "一句話解讀圖片", { fontSize: 28, color: "#6b5a3e" }),
          },
        },
      ],
    };
  },

  arcBridge: (payload) => {
    const p = payload || {};
    const img = String(p.imageUrl || "").trim();
    return {
      bg: { type: "photo", color: "#0d1015", overlay: 0.42, image: "", imageX: 50, imageY: 50, imageFit: "cover", imageScale: 100 },
      components: [
        {
          type: "quote",
          data: {
            label: _ccRt(p.quoteLabel || p.label || "他們心裡在想", {
              fontSize: 22,
              color: "rgba(255,255,255,0.5)",
            }),
            text: _ccRt(p.quote || p.body || "「一句真實的原話或內心獨白。」", {
              fontSize: 34,
              fontFamily: "Noto Serif TC",
              italic: true,
              color: "rgba(255,255,255,0.92)",
            }),
          },
        },
        {
          type: "image",
          data: { src: img, width: 70, posX: 50, posY: 50, borderRadius: 12, objectFit: "cover" },
        },
      ],
    };
  },

  arcCtaFinal: (payload) => {
    const p = payload || {};
    return {
      bg: { type: "photo", color: "#0d100a", overlay: 0.5, image: "", imageX: 50, imageY: 50, imageFit: "cover", imageScale: 100 },
      components: [
        { type: "label", data: { text: _ccRt(p.label || "下一步", { fontSize: 24, color: "#c9a84c" }) } },
        {
          type: "heading",
          data: {
            text: _ccRt(p.headline || p.heading || "把學習變成行動", {
              fontSize: 102,
              fontFamily: "Noto Serif TC",
              bold: true,
              italic: true,
              color: "#ffffff",
            }),
          },
        },
        {
          type: "cta",
          data: {
            sub: _ccRt(p.sub || p.body || "留言關鍵字或點連結加入 Workshop", {
              fontSize: 28,
              color: "rgba(255,255,255,0.78)",
            }),
            keyword: String(p.keyword || "報名").trim() || "報名",
          },
        },
      ],
    };
  },

  /** IG 教學卡風格（cream bg, orange accent）— 5 templateIds */
  cardFeature: (payload) => {
    const p = payload || {};
    return {
      bg: { type: "cream", color: "#faf8f5", overlay: 0, image: "", imageX: 50, imageY: 50, imageFit: "cover", imageScale: 100 },
      components: [
        { type: "label", data: { text: _ccRt(p.badge || p.label || "功能名稱", { fontSize: 26, color: "#e8734a" }) } },
        { type: "heading", data: { text: _ccRt(p.headline || p.heading || "Feature Title", { fontSize: 96, fontFamily: "Noto Serif TC", bold: true, color: "#1a1a1a" }) } },
        { type: "body", data: { text: _ccRt(p.body || "功能描述…", { fontSize: 30, color: "#444444" }) } },
        { type: "pills", data: { items: (Array.isArray(p.pills) ? p.pills : [p.pill1, p.pill2, p.pill3, p.pill4].filter(Boolean)).map(function(t) { return _ccRt(String(t), { fontSize: 24, color: "#ffffff" }); }) } },
      ],
    };
  },

  cardIconList: (payload) => {
    const p = payload || {};
    const items = Array.isArray(p.items) ? p.items : [];
    return {
      bg: { type: "cream", color: "#faf8f5", overlay: 0, image: "", imageX: 50, imageY: 50, imageFit: "cover", imageScale: 100 },
      components: [
        { type: "heading", data: { text: _ccRt(p.headline || p.heading || "List Title", { fontSize: 88, fontFamily: "Noto Serif TC", bold: true, color: "#1a1a1a" }) } },
        { type: "body", data: { text: _ccRt(p.sub || p.body || "Subtitle here", { fontSize: 28, color: "#444444" }) } },
        { type: "iconList", data: { items: items.map(function(it) {
          return {
            icon: it.icon || "◆",
            title: _ccRt(it.title || "Title", { fontSize: 28, bold: true, color: "#1a1a1a" }),
            body: _ccRt(it.body || it.desc || "Description", { fontSize: 22, color: "#666666" }),
          };
        }) } },
      ],
    };
  },

  cardNumberedImg: (payload) => {
    const p = payload || {};
    const items = Array.isArray(p.items) ? p.items : [];
    const img = String(p.imageUrl || "").trim();
    return {
      bg: { type: "cream", color: "#faf8f5", overlay: 0, image: "", imageX: 50, imageY: 50, imageFit: "cover", imageScale: 100 },
      components: [
        { type: "heading", data: { text: _ccRt(p.headline || p.heading || "Numbered List + Screenshot", { fontSize: 82, fontFamily: "Noto Serif TC", bold: true, color: "#1a1a1a" }) } },
        { type: "numberedList", data: { items: items.map(function(it, i) {
          return {
            num: it.num || String(i + 1),
            title: _ccRt(it.title || "Item " + (i + 1), { fontSize: 28, bold: true, color: "#1a1a1a" }),
            body: _ccRt(it.body || it.desc || "", { fontSize: 22, color: "#666666" }),
          };
        }) } },
        { type: "image", data: { src: img, width: 88, posX: 50, posY: 50, borderRadius: 12, objectFit: "cover" } },
        { type: "body", data: { text: _ccRt(p.annotation || p.note || "", { fontSize: 26, italic: true, color: "#666666" }) } },
      ],
    };
  },

  cardStepsGuide: (payload) => {
    const p = payload || {};
    const items = Array.isArray(p.steps) ? p.steps : (Array.isArray(p.items) ? p.items : []);
    return {
      bg: { type: "cream", color: "#faf8f5", overlay: 0, image: "", imageX: 50, imageY: 50, imageFit: "cover", imageScale: 100 },
      components: [
        { type: "label", data: { text: _ccRt(p.label || "GUIDE", { fontSize: 22, color: "#e8734a" }) } },
        { type: "heading", data: { text: _ccRt(p.headline || p.heading || "Step-by-Step Guide", { fontSize: 86, fontFamily: "Noto Serif TC", bold: true, color: "#1a1a1a" }) } },
        { type: "numberedList", data: { items: items.map(function(it, i) {
          return {
            num: it.num || String(i + 1),
            title: _ccRt(it.title || "Step " + (i + 1), { fontSize: 28, bold: true, color: "#1a1a1a" }),
            body: _ccRt(it.body || it.desc || "", { fontSize: 22, color: "#666666" }),
          };
        }) } },
      ],
    };
  },

  cardDarkShowcase: (payload) => {
    const p = payload || {};
    const img = String(p.imageUrl || "").trim();
    return {
      bg: { type: "photo", color: "#0d0d0d", overlay: 0.12, image: "", imageX: 50, imageY: 50, imageFit: "cover", imageScale: 100 },
      components: [
        { type: "heading", data: { text: _ccRt(p.headline || p.heading || "Showcase Title", { fontSize: 92, fontFamily: "Noto Serif TC", bold: true, italic: true, color: "#ffffff" }) } },
        { type: "body", data: { text: _ccRt(p.body || "Description…", { fontSize: 28, color: "rgba(255,255,255,0.78)" }) } },
        { type: "image", data: { src: img, width: 90, posX: 50, posY: 50, borderRadius: 14, objectFit: "cover" } },
      ],
    };
  },
};

function _openclawHexSigEqual(received, expectedHex) {
  if (typeof received !== "string" || typeof expectedHex !== "string" || received.length !== expectedHex.length) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(received, "utf8"), Buffer.from(expectedHex, "utf8"));
  } catch {
    return false;
  }
}

function _normalizeCarouselSlide(rawSlide) {
  const slide = rawSlide && typeof rawSlide === "object" ? JSON.parse(JSON.stringify(rawSlide)) : {};
  if (!slide.bg || typeof slide.bg !== "object") {
    slide.bg = { type: "photo", color: "#1a1508", overlay: 0.42, image: "", imageX: 50, imageY: 50, imageFit: "cover", imageScale: 100 };
  }
  if (!Array.isArray(slide.components)) slide.components = [];
  if (!Array.isArray(slide.objects)) slide.objects = [];
  slide.components = slide.components.map((comp) => {
    const next = comp && typeof comp === "object" ? { ...comp } : { type: "body", data: { text: _ccRt("") } };
    if (next.scale == null || Number.isNaN(Number(next.scale))) next.scale = 1;
    if (next.offsetX == null || Number.isNaN(Number(next.offsetX))) next.offsetX = 0;
    if (next.offsetY == null || Number.isNaN(Number(next.offsetY))) next.offsetY = 0;
    return next;
  });
  slide.objects = slide.objects.map((obj, index) => {
    const next = obj && typeof obj === "object" ? { ...obj } : { type: "rect" };
    if (!next.id) next.id = "bot-obj-" + index;
    if (next.x == null || Number.isNaN(Number(next.x))) next.x = 160;
    if (next.y == null || Number.isNaN(Number(next.y))) next.y = 160;
    if (next.w == null || Number.isNaN(Number(next.w))) next.w = 240;
    if (next.h == null || Number.isNaN(Number(next.h))) next.h = 120;
    if (next.rotation == null || Number.isNaN(Number(next.rotation))) next.rotation = 0;
    if (next.scale == null || Number.isNaN(Number(next.scale))) next.scale = 1;
    if (!next.layer) next.layer = "front";
    if (next.zIndex == null || Number.isNaN(Number(next.zIndex))) next.zIndex = index + 1;
    return next;
  });
  return slide;
}

exports.upsertCarousel = onRequest(
  {
    region: REGION,
    timeoutSeconds: 30,
    cors: false,
    invoker: "public",
    secrets: [openclawCarouselHmacSecret],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const secretValue = openclawCarouselHmacSecret.value();
    if (!secretValue) {
      console.error("upsertCarousel: HMAC_SECRET not configured");
      res.status(500).send("Server misconfiguration");
      return;
    }

    const rawBuf =
      req.rawBody !== undefined && req.rawBody !== null
        ? Buffer.isBuffer(req.rawBody)
          ? req.rawBody
          : Buffer.from(String(req.rawBody), "utf8")
        : Buffer.from(JSON.stringify(req.body && typeof req.body === "object" ? req.body : {}), "utf8");

    const sigHeader = req.headers["x-openclaw-signature"];
    const sig = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;
    const expected = crypto.createHmac("sha256", secretValue).update(rawBuf).digest("hex");

    if (!_openclawHexSigEqual(String(sig || ""), expected)) {
      res.status(401).send("Unauthorized");
      return;
    }

    let body;
    try {
      body = JSON.parse(rawBuf.toString("utf8"));
    } catch (e) {
      res.status(400).send("Invalid JSON body");
      return;
    }

    const idempotencyKey = body && body.idempotencyKey;
    const templateId = body && body.templateId;
    const payload = (body && body.payload && typeof body.payload === "object") ? body.payload : {};
    const name = body && body.name;
    const rawSlidesBody = Array.isArray(body && body.slides) &&
      body.slides.some((item) => item && typeof item === "object" && (item.bg || Array.isArray(item.components) || Array.isArray(item.objects)))
      ? body.slides
      : null;
    const slidesSpecRaw = body && body.slidesSpec ? body.slidesSpec : (rawSlidesBody ? null : body && body.slides);
    const projectDimRaw = body && body.projectDim;

    if (!idempotencyKey || typeof idempotencyKey !== "string" || idempotencyKey.length > 200) {
      res.status(400).send("idempotencyKey required");
      return;
    }

    const SLIDES_SPEC_MAX = 24;
    let slidesSpec = null;
    let rawSlides = null;
    if (rawSlidesBody) {
      if (rawSlidesBody.length === 0) {
        res.status(400).send("slides must be a non-empty array");
        return;
      }
      if (rawSlidesBody.length > SLIDES_SPEC_MAX) {
        res.status(400).send("slides too long");
        return;
      }
      rawSlides = rawSlidesBody;
    }
    if (slidesSpecRaw !== undefined && slidesSpecRaw !== null) {
      if (!Array.isArray(slidesSpecRaw) || slidesSpecRaw.length === 0) {
        res.status(400).send("slidesSpec must be a non-empty array");
        return;
      }
      if (slidesSpecRaw.length > SLIDES_SPEC_MAX) {
        res.status(400).send("slidesSpec too long");
        return;
      }
      slidesSpec = slidesSpecRaw;
    }

    if (!rawSlides && !slidesSpec) {
      if (!templateId || typeof templateId !== "string") {
        res.status(400).send("templateId required (or send slidesSpec/slides)");
        return;
      }
      if (!_carouselTemplateFactories[templateId]) {
        res.status(400).send("Invalid templateId");
        return;
      }
    } else if (slidesSpec) {
      for (let si = 0; si < slidesSpec.length; si++) {
        const item = slidesSpec[si];
        if (!item || typeof item !== "object") {
          res.status(400).send("slidesSpec[" + si + "] invalid");
          return;
        }
        const tid = item.templateId;
        if (!tid || typeof tid !== "string" || !_carouselTemplateFactories[tid]) {
          res.status(400).send("Invalid templateId at slidesSpec[" + si + "]");
          return;
        }
        if (item.payload !== undefined && item.payload !== null && typeof item.payload !== "object") {
          res.status(400).send("slidesSpec[" + si + "].payload must be an object");
          return;
        }
      }
    } else {
      for (let si = 0; si < rawSlides.length; si++) {
        const slide = rawSlides[si];
        if (!slide || typeof slide !== "object") {
          res.status(400).send("slides[" + si + "] invalid");
          return;
        }
      }
    }

    try {
      const existing = await db
        .collection("carouselProjects")
        .where("automation.idempotencyKey", "==", idempotencyKey)
        .limit(1)
        .get();

      if (!existing.empty) {
        res.status(200).json({ status: "exists", id: existing.docs[0].id });
        return;
      }

      let slides;
      if (rawSlides) {
        slides = rawSlides.map(_normalizeCarouselSlide);
      } else if (slidesSpec) {
        slides = slidesSpec.map((item) => {
          const fac = _carouselTemplateFactories[item.templateId];
          const pl = (item.payload && typeof item.payload === "object") ? item.payload : {};
          return fac(pl);
        });
      } else {
        slides = [_carouselTemplateFactories[templateId](payload)];
      }

      const docRef = await db.collection("carouselProjects").add({
        name: (typeof name === "string" && name.trim()) || "Automated Carousel",
        ownerUid: "OPENCLAW_BOT_SYSTEM_USER",
        projectDim: projectDimRaw && typeof projectDimRaw === "object" && Number(projectDimRaw.w) > 0 && Number(projectDimRaw.h) > 0
          ? { w: Number(projectDimRaw.w), h: Number(projectDimRaw.h), name: projectDimRaw.name || "IG 貼文" }
          : { w: 1080, h: 1350, name: "IG 貼文" },
        slides,
        automation: {
          status: "ready",
          idempotencyKey,
          lastTriggeredAt: admin.firestore.Timestamp.now(),
          triggerSource: "openclaw-bot",
        },
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      res.status(201).json({ status: "created", id: docRef.id });
    } catch (err) {
      console.error("upsertCarousel error:", err);
      res.status(500).send("Server error");
    }
  }
);

/**
 * Recursively convert Firestore Timestamps (and nested data) for JSON responses.
 */
function _serializeFirestoreValueForJson(val) {
  if (val === null || val === undefined) return val;
  if (val instanceof admin.firestore.Timestamp) return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (Array.isArray(val)) return val.map(_serializeFirestoreValueForJson);
  if (typeof val === "object") {
    const out = {};
    for (const k of Object.keys(val)) {
      out[k] = _serializeFirestoreValueForJson(val[k]);
    }
    return out;
  }
  return val;
}

/**
 * GET — public JSON list of workshop documents (Firestore `workshops`).
 * Query: ?visibleOnly=1 — only rows where visible !== false and archived !== true.
 *
 * URL (direct):
 *   https://asia-east2-aiflowtime-hk.cloudfunctions.net/publicWorkshopEvents
 * URL (via hosting rewrite):
 *   https://aiflowtime-hk.web.app/api/workshop-events
 */
exports.publicWorkshopEvents = onRequest(
  { region: REGION, timeoutSeconds: 30, cors: true, invoker: "public" },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "GET") {
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }
    try {
      const snap = await db.collection("workshops").get();
      const visibleOnly =
        String(req.query.visibleOnly || "") === "1" ||
        String(req.query.visibleOnly || "").toLowerCase() === "true";
      const workshops = [];
      snap.forEach((doc) => {
        const raw = doc.data() || {};
        if (visibleOnly) {
          if (raw.visible === false) return;
          if (raw.archived === true) return;
        }
        workshops.push({
          id: doc.id,
          ..._serializeFirestoreValueForJson(raw),
        });
      });
      workshops.sort((a, b) => {
        const ao = Number(a.order);
        const bo = Number(b.order);
        const aOk = Number.isFinite(ao);
        const bOk = Number.isFinite(bo);
        if (aOk && bOk) return ao - bo;
        if (aOk) return -1;
        if (bOk) return 1;
        return String(a.title || a.id || "").localeCompare(String(b.title || b.id || ""));
      });
      res.set("Cache-Control", "public, max-age=60");
      res.status(200).json({
        ok: true,
        generatedAt: new Date().toISOString(),
        count: workshops.length,
        workshops,
      });
    } catch (err) {
      console.error("publicWorkshopEvents:", err);
      res.status(500).json({ ok: false, error: "Failed to load workshops" });
    }
  }
);

