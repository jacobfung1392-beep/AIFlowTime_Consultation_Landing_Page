/**
 * Workshop Cloud Functions for AIFLOWTIME
 * - createWorkshopReservation: creates pending reservation, returns Stripe Checkout URL
 * - stripeWebhook: on payment success, confirms reservation (seat reserved)
 * - releaseExpiredReservations: scheduled job to mark expired pendings
 * - getWorkshopPrice: returns server-verified workshop price (with discount)
 * - confirmPaymentUpload: validates screenshot upload
 * - onRegistrationCreated: Firestore trigger — recomputes workshop enrolled from pending+confirmed
 * - repairWorkshopEnrollmentCounts: one-off repair endpoint for derived counters
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const Stripe = require("stripe");

admin.initializeApp();
const db = admin.firestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" });

const RESERVATION_MINUTES = 10;
const WORKSHOP_ID_DEFAULT = "ai-beginner-2026";
const REGION = "asia-east2";

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
  { region: REGION, cors: true, invoker: "public" },
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

    if (reg._enrollmentCounted) {
      return { success: true, alreadyCounted: true };
    }

    await regRef.update({ _enrollmentCounted: true });
    return { success: true, alreadyCounted: false };
  }
);

function isEnrolledStatus(s) {
  const t = (s || "pending").toString().toLowerCase();
  return t === "pending" || t === "confirmed";
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
  }
  return true;
}

function sameSessionCounters(currentSessions, nextSessions) {
  const current = sortSessions(currentSessions || []).map((session, index) => ({
    id: session.id || sessionStableId(session, index),
    enrolled: session.enrolled || 0,
  }));
  const next = sortSessions(nextSessions || []).map((session, index) => ({
    id: session.id || sessionStableId(session, index),
    enrolled: session.enrolled || 0,
  }));
  if (current.length !== next.length) return false;
  for (let i = 0; i < current.length; i++) {
    if (current[i].id !== next[i].id) return false;
    if (current[i].enrolled !== next[i].enrolled) return false;
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
    if (isEnrolledStatus(reg.status)) enrolled.push(reg);
  });

  const updateData = { enrolled: enrolled.length };
  const registrationNormalizations = [];

  if (workshop.courseType === "continuous" && Array.isArray(workshop.rounds) && workshop.rounds.length) {
    const perRound = {};
    workshop.rounds.forEach((round) => {
      perRound[round.id || round] = 0;
    });
    enrolled.forEach((reg) => {
      const matchedRound = resolveLegacyRoundMatch(reg, workshop.rounds);
      if (!matchedRound) return;

      const roundId = matchedRound.id || matchedRound;
      if (perRound[roundId] !== undefined) perRound[roundId]++;

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
      return { ...round, enrolled: perRound[id] ?? 0 };
    });
  } else if (Array.isArray(workshop.sessions) && workshop.sessions.length > 1) {
    const sortedSessions = sortSessions(workshop.sessions);
    const perSession = {};
    sortedSessions.forEach((session, index) => {
      if (!session.id) session.id = sessionStableId(session, index);
      perSession[session.id] = 0;
    });
    enrolled.forEach((reg) => {
      const matchedSession = resolveLegacySessionMatch(reg, sortedSessions);
      if (!matchedSession) return;
      perSession[matchedSession.id] = (perSession[matchedSession.id] || 0) + 1;

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

  const enrolledRegs = registrations.filter((reg) => isEnrolledStatus(reg.status));
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
    if (isEnrolledStatus(reg.status)) countedRegs.push(reg);
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

/**
 * Image proxy — serves Firebase Storage files through the app domain.
 * Bypasses DNS issues with firebasestorage.googleapis.com.
 * Usage: /api/storageProxy?path=workshop-images/file.jpg
 */
exports.storageProxy = onRequest(
  { region: REGION, timeoutSeconds: 30, cors: true },
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
      res.set("Content-Type", metadata.contentType || "application/octet-stream");
      res.set("Cache-Control", "public, max-age=86400");
      file.createReadStream().pipe(res);
    } catch (err) {
      console.error("storageProxy error:", err);
      res.status(500).send("Error fetching file");
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

