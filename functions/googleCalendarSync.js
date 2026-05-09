/**
 * Google Calendar ↔ Workshop CMS (Firestore as source of truth for push).
 * - OAuth creates a dedicated "AIFlowTime Workshops" calendar (never wipes personal events).
 * - Sync only inserts/updates/deletes events we created (tracked IDs + private extended props).
 */

const { onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { google } = require("googleapis");
const crypto = require("crypto");

const AIFLOW_SOURCE = "workshop-cms";
const CALENDAR_SUMMARY = "AIFlowTime Workshops";
const SYNC_KEY_PREFIX = "v1";
const googleCalendarClientId = defineSecret("GOOGLE_CALENDAR_CLIENT_ID");
const googleCalendarClientSecret = defineSecret("GOOGLE_CALENDAR_CLIENT_SECRET");

const CMS_ADMIN_EMAILS = new Set([
  "jacobfung1392@gmail.com",
  "jacobfung@aiflowtime.com",
]);

function _assertCmsAdmin(auth) {
  const email = auth?.token?.email;
  if (!email || auth.token.email_verified !== true || !CMS_ADMIN_EMAILS.has(email)) {
    throw new HttpsError("permission-denied", "Admin only.");
  }
}

function _cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function _previewClientId(clientId) {
  const s = _cleanString(clientId);
  if (!s) return "";
  if (s.length <= 14) return s;
  return `${s.slice(0, 6)}...${s.slice(-6)}`;
}

function _isValidGoogleOAuthClientId(clientId) {
  return /^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/.test(_cleanString(clientId));
}

function _oauthRedirectUri(region, projectId) {
  return `https://${region}-${projectId}.cloudfunctions.net/calendarOAuthCallback`;
}

async function _getOAuthConfig(db) {
  const clientId = _cleanString(googleCalendarClientId.value() || process.env.GOOGLE_CALENDAR_CLIENT_ID);
  const clientSecret = _cleanString(googleCalendarClientSecret.value() || process.env.GOOGLE_CALENDAR_CLIENT_SECRET);
  return {
    clientId,
    clientSecret,
  };
}

async function _requireOAuthConfig(db) {
  const cfg = await _getOAuthConfig(db);
  if (!cfg.clientId || !cfg.clientSecret) {
    throw new HttpsError(
      "failed-precondition",
      "Google 日曆 OAuth 後端尚未設定完成。請確認 Firebase Secret Manager 已設定 GOOGLE_CALENDAR_CLIENT_ID 與 GOOGLE_CALENDAR_CLIENT_SECRET。"
    );
  }
  if (!_isValidGoogleOAuthClientId(cfg.clientId)) {
    throw new HttpsError(
      "failed-precondition",
      "Google 日曆 OAuth 後端 Client ID 格式不正確，請檢查 Firebase Secret Manager 的 GOOGLE_CALENDAR_CLIENT_ID。"
    );
  }
  return cfg;
}

function _normDateKey(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const d = dateStr.replace(/[年月]/g, "-").replace(/[日]/g, "").replace(/（.*）/g, "").trim();
  const parts = d.split(/[-+/]/).map((p) => parseInt(p.trim(), 10));
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
    const y = parts[0];
    const mo = parts[1];
    const da = parts[2];
    return `${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`;
  }
  const m = dateStr.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (m) {
    return `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;
  }
  return null;
}

/** Hong Kong wall clock → UTC ISO (no DST). */
function _hktToIso(dateKey, hh, mm) {
  const [y, mo, d] = dateKey.split("-").map((x) => parseInt(x, 10));
  const utcMs = Date.UTC(y, mo - 1, d, hh - 8, mm, 0);
  return new Date(utcMs).toISOString();
}

/** Instant (RFC3339) → Hong Kong wall-clock parts (+08:00, no DST). */
function _isoToHkParts(iso) {
  const ms = new Date(iso).getTime();
  const hkt = new Date(ms + 8 * 3600000);
  return {
    y: hkt.getUTCFullYear(),
    mo: hkt.getUTCMonth() + 1,
    day: hkt.getUTCDate(),
    hh: hkt.getUTCHours(),
    mm: hkt.getUTCMinutes(),
  };
}

function _parseTimeStartEnd(timeStr) {
  const s = String(timeStr || "").trim();
  if (!s) return { startH: 10, startM: 0, endH: 12, endM: 0 };
  const matches = [];
  const re = /(\d{1,2})\s*:\s*(\d{2})/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    matches.push({ h: parseInt(m[1], 10), mi: parseInt(m[2], 10) });
  }
  if (!matches.length) {
    const re2 = /(\d{1,2})\s*[時时]\s*(?:(\d{1,2})\s*分?)?/;
    const mx = re2.exec(s.replace(/上午|下午|晚上|中午/g, ""));
    if (mx) {
      let h = parseInt(mx[1], 10);
      const mi = mx[2] ? parseInt(mx[2], 10) : 0;
      if (/下午|晚上/.test(s) && h < 12) h += 12;
      matches.push({ h, mi });
    }
  }
  const start = matches[0] || { h: 10, mi: 0 };
  const end = matches[1] || { h: Math.min(23, start.h + 2), mi: start.mi };
  return {
    startH: start.h,
    startM: start.mi,
    endH: end.h,
    endM: end.mi,
  };
}

function _collectDesiredCalendarItems(workshopsSnap) {
  /** @type {Map<string, object>} */
  const byKey = new Map();
  workshopsSnap.forEach((doc) => {
    const ws = doc.data() || {};
    const wsId = doc.id;
    if (ws.archived === true) return;
    const titleBase = (ws.workshopNumber ? `${ws.workshopNumber} - ` : "") + (ws.title || wsId);

    const pushOne = (dateRaw, timeStr, loc, mode, zoomLink, syncKey, extraLines) => {
      const dateKey = _normDateKey(dateRaw);
      if (!dateKey) return;
      const { startH, startM, endH, endM } = _parseTimeStartEnd(timeStr);
      const startIso = _hktToIso(dateKey, startH, startM);
      const endIso = _hktToIso(dateKey, endH, endM);
      const desc = [
        `Workshop ID: ${wsId}`,
        `Sync key: ${syncKey}`,
        mode ? `Mode: ${mode}` : "",
        loc ? `Location: ${loc}` : "",
        zoomLink ? `Link: ${zoomLink}` : "",
        ...(extraLines || []),
        "",
        `Managed by AIFlowTime CMS (single push deletes only events we created).`,
      ]
        .filter(Boolean)
        .join("\n");
      byKey.set(syncKey, {
        syncKey,
        workshopId: wsId,
        summary: titleBase,
        description: desc,
        startIso,
        endIso,
        location: mode === "online" ? "" : String(loc || "").trim(),
      });
    };

    if (ws.courseType === "continuous" && Array.isArray(ws.rounds)) {
      ws.rounds.forEach((round, ri) => {
        const rid = String(round?.id || `round${ri}`);
        (round?.sessions || []).forEach((s, si) => {
          const sid = s?.id ? String(s.id) : `i${si}`;
          const sk = `${SYNC_KEY_PREFIX}|${wsId}|r|${rid}|s|${sid}`;
          pushOne(
            s.date,
            s.time,
            s.location || ws.location,
            s.mode || ws.mode,
            s.zoomLink || ws.zoomLink,
            sk,
            [round?.label ? `Round: ${round.label}` : "", s?.label ? `Session: ${s.label}` : ""]
          );
        });
      });
      return;
    }

    if (Array.isArray(ws.sessions) && ws.sessions.length) {
      ws.sessions.forEach((s, si) => {
        const sid = s?.id ? String(s.id) : `i${si}`;
        const sk = `${SYNC_KEY_PREFIX}|${wsId}|s|${sid}`;
        pushOne(s.date, s.time, s.location || ws.location, s.mode || ws.mode, s.zoomLink || ws.zoomLink, sk, [
          s?.label ? `Session: ${s.label}` : "",
        ]);
      });
      return;
    }

    if (ws.date) {
      const sk = `${SYNC_KEY_PREFIX}|${wsId}|main`;
      pushOne(ws.date, ws.time, ws.location, ws.mode, ws.zoomLink, sk, []);
    }
  });
  return byKey;
}

async function _getOAuthClient(db, region, projectId) {
  const { clientId, clientSecret } = await _requireOAuthConfig(db);
  const redirectUri = _oauthRedirectUri(region, projectId);
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const tokSnap = await db.doc("adminPrivate/googleCalendarTokens").get();
  if (!tokSnap.exists) {
    throw new HttpsError("failed-precondition", "Google Calendar is not connected. Use Settings → Connect.");
  }
  const t = tokSnap.data() || {};
  if (!t.refresh_token) {
    throw new HttpsError("failed-precondition", "Missing refresh token. Reconnect Google Calendar.");
  }
  oauth2.setCredentials({
    refresh_token: t.refresh_token,
    access_token: t.access_token || undefined,
  });
  return { oauth2 };
}

async function _ensureFreshAccessToken(db, oauth2) {
  const { credentials } = await oauth2.refreshAccessToken();
  await db.doc("adminPrivate/googleCalendarTokens").set(
    {
      access_token: credentials.access_token,
      access_token_expiry: credentials.expiry_date ? admin.firestore.Timestamp.fromMillis(credentials.expiry_date) : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  oauth2.setCredentials(credentials);
}

function registerGoogleCalendarIntegration({ db, REGION }) {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "aiflowtime-hk";

  async function execGetStatus(request) {
      _assertCmsAdmin(request.auth);
      const [cfg, metaSnap] = await Promise.all([
        _getOAuthConfig(db),
        db.doc("siteSettings/googleCalendar").get(),
      ]);
      const meta = metaSnap.exists ? metaSnap.data() || {} : {};
      return {
        ok: true,
        configured: !!(cfg.clientId && cfg.clientSecret),
        hasClientId: !!cfg.clientId,
        hasClientSecret: !!cfg.clientSecret,
        clientIdPreview: _previewClientId(cfg.clientId),
        redirectUri: _oauthRedirectUri(REGION, projectId),
        connected: meta.connected === true,
        connectedEmail: meta.connectedEmail || "",
        targetCalendarId: meta.targetCalendarId || "",
        calendarSummary: meta.calendarSummary || CALENDAR_SUMMARY,
      };
  }

  async function execGetOAuthUrl(request) {
      _assertCmsAdmin(request.auth);
      const { clientId } = await _requireOAuthConfig(db);
      const state = crypto.randomBytes(24).toString("hex");
      const redirectUri = _oauthRedirectUri(REGION, projectId);
      await db.doc(`calendarOauthPending/${state}`).set({
        uid: request.auth.uid,
        email: request.auth.token.email,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 15 * 60 * 1000),
      });
      const scopes = [
        "https://www.googleapis.com/auth/calendar",
      ];
      const url =
        "https://accounts.google.com/o/oauth2/v2/auth" +
        `?client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        "&response_type=code" +
        `&scope=${encodeURIComponent(scopes.join(" "))}` +
        `&state=${encodeURIComponent(state)}` +
        "&access_type=offline" +
        "&prompt=consent";
      return { url, redirectUri };
  }

  const calendarOAuthCallback = onRequest(
    { region: REGION, secrets: [googleCalendarClientId, googleCalendarClientSecret], cors: false, invoker: "public" },
    async (req, res) => {
      const cmsBase = process.env.SITE_URL || "https://aiflowtime-hk.web.app";
      const errRedirect = (msg) => {
        res.redirect(302, `${cmsBase}/workshop-cms?gcal=err&reason=${encodeURIComponent(msg)}#settings`);
      };
      try {
        if (req.method !== "GET") {
          res.status(405).send("Method not allowed");
          return;
        }
        const code = req.query.code;
        const state = req.query.state;
        if (!code || !state) {
          errRedirect("missing_code_or_state");
          return;
        }
        const pendingRef = db.doc(`calendarOauthPending/${state}`);
        const pendingSnap = await pendingRef.get();
        if (!pendingSnap.exists) {
          errRedirect("invalid_or_expired_state");
          return;
        }
        const pend = pendingSnap.data();
        if (pend.expiresAt && pend.expiresAt.toMillis() < Date.now()) {
          await pendingRef.delete();
          errRedirect("expired_state");
          return;
        }

        const { clientId, clientSecret } = await _requireOAuthConfig(db);
        const redirectUri = _oauthRedirectUri(REGION, projectId);
        const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        const { tokens } = await oauth2.getToken(String(code));
        if (!tokens.refresh_token) {
          await pendingRef.delete();
          errRedirect("no_refresh_token_revoke_and_retry");
          return;
        }

        oauth2.setCredentials(tokens);
        const calendar = google.calendar({ version: "v3", auth: oauth2 });

        const metaSnap = await db.doc("siteSettings/googleCalendar").get();
        let calendarId = metaSnap.exists ? String((metaSnap.data() || {}).targetCalendarId || "") : "";
        if (!calendarId) {
          const created = await calendar.calendars.insert({
            requestBody: {
              summary: CALENDAR_SUMMARY,
              timeZone: "Asia/Hong_Kong",
              description: "Workshop schedule — synced from AIFlowTime CMS. Safe to delete after disconnecting in CMS.",
            },
          });
          calendarId = created.data.id || "";
        }
        if (!calendarId) {
          await pendingRef.delete();
          errRedirect("failed_to_create_calendar");
          return;
        }

        await db.doc("adminPrivate/googleCalendarTokens").set(
          {
            refresh_token: tokens.refresh_token,
            access_token: tokens.access_token || null,
            access_token_expiry: tokens.expiry_date
              ? admin.firestore.Timestamp.fromMillis(tokens.expiry_date)
              : null,
            scope: tokens.scope || "",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        await db.doc("siteSettings/googleCalendar").set(
          {
            connected: true,
            connectedEmail: pend.email || "",
            targetCalendarId: calendarId,
            calendarSummary: CALENDAR_SUMMARY,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        await pendingRef.delete();
        res.redirect(302, `${cmsBase}/workshop-cms?gcal=ok#settings`);
      } catch (e) {
        console.error("calendarOAuthCallback", e);
        res.redirect(302, `${cmsBase}/workshop-cms?gcal=err&reason=${encodeURIComponent(e.message || "oauth_error")}#settings`);
      }
    }
  );

  async function execDisconnect(request) {
      _assertCmsAdmin(request.auth);
      await db.doc("adminPrivate/googleCalendarTokens").delete().catch(() => {});
      await db.doc("siteSettings/googleCalendar").set(
        {
          connected: false,
          connectedEmail: admin.firestore.FieldValue.delete(),
          targetCalendarId: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return { ok: true };
  }

  async function execSyncWorkshops(request) {
      _assertCmsAdmin(request.auth);
      const { oauth2 } = await _getOAuthClient(db, REGION, projectId);
      await _ensureFreshAccessToken(db, oauth2);
      const calSdk = google.calendar({ version: "v3", auth: oauth2 });
      const metaRef = db.doc("siteSettings/googleCalendar");
      const meta = (await metaRef.get()).data() || {};
      const calendarId = String(meta.targetCalendarId || "").trim();
      if (!calendarId) {
        throw new HttpsError("failed-precondition", "No target calendar. Connect Google Calendar in Settings.");
      }

      const wsSnap = await db.collection("workshops").get();
      const desired = _collectDesiredCalendarItems(wsSnap);

      /** workshopId -> { [syncKey]: eventId } */
      const storedMaps = new Map();
      wsSnap.forEach((doc) => {
        const m = (doc.data() || {}).googleCalendarEventIds;
        if (m && typeof m === "object") storedMaps.set(doc.id, { ...m });
      });
      const eventIndex = meta.eventIndex && typeof meta.eventIndex === "object" ? { ...meta.eventIndex } : {};
      Object.keys(eventIndex).forEach((syncKey) => {
        const row = eventIndex[syncKey] || {};
        const wsId = String(row.workshopId || "");
        if (!wsId || !row.eventId) return;
        if (!storedMaps.has(wsId)) storedMaps.set(wsId, {});
        const idMap = storedMaps.get(wsId);
        if (!idMap[syncKey]) idMap[syncKey] = row.eventId;
      });

      let created = 0;
      let updated = 0;

      for (const [syncKey, item] of desired.entries()) {
        if (!storedMaps.has(item.workshopId)) storedMaps.set(item.workshopId, {});
        const idMap = storedMaps.get(item.workshopId);
        let eventId = (eventIndex[syncKey] && eventIndex[syncKey].eventId) || idMap[syncKey] || "";

        const requestBody = {
          summary: item.summary,
          description: item.description,
          location: item.location || undefined,
          start: { dateTime: item.startIso },
          end: { dateTime: item.endIso },
          extendedProperties: {
            private: {
              aiflowSource: AIFLOW_SOURCE,
              aiflowSyncKey: syncKey,
              aiflowWorkshopId: item.workshopId,
            },
          },
        };

        if (eventId) {
          try {
            await calSdk.events.update({
              calendarId,
              eventId,
              requestBody,
            });
            updated++;
          } catch (e) {
            const st = e.response && e.response.status;
            if (e.code === 404 || st === 404) {
              eventId = "";
            } else throw e;
          }
        }
        if (!eventId) {
          const ins = await calSdk.events.insert({
            calendarId,
            requestBody,
          });
          eventId = ins.data.id;
          created++;
        }
        idMap[syncKey] = eventId;
        storedMaps.set(item.workshopId, idMap);
        eventIndex[syncKey] = {
          eventId,
          workshopId: item.workshopId,
          updatedAt: new Date().toISOString(),
        };
      }

      let deleted = 0;
      const desiredSyncKeys = new Set(desired.keys());
      for (const syncKey of Object.keys(eventIndex)) {
        if (desiredSyncKeys.has(syncKey)) continue;
        const row = eventIndex[syncKey] || {};
        const eventId = row.eventId || "";
        const workshopId = row.workshopId || "";
        delete eventIndex[syncKey];
        if (workshopId && storedMaps.has(workshopId)) {
          const idMap = storedMaps.get(workshopId);
          delete idMap[syncKey];
          storedMaps.set(workshopId, idMap);
        }
        if (eventId) {
          try {
            await calSdk.events.delete({ calendarId, eventId });
            deleted++;
          } catch (e) {
            const st = e.response && e.response.status;
            if (e.code !== 404 && st !== 404) console.warn("calendar delete stale index", e.message);
          }
        }
      }
      for (const [wsId, idMap] of storedMaps.entries()) {
        const desiredSet = new Set(
          [...desired.values()].filter((x) => x.workshopId === wsId).map((x) => x.syncKey)
        );
        const wsRef = db.collection("workshops").doc(wsId);
        const wsDoc = wsSnap.docs.find((doc) => doc.id === wsId);
        if (!wsDoc) continue;
        const nextMap = { ...idMap };
        for (const k of Object.keys(nextMap)) {
          if (desiredSet.has(k)) continue;
          const eid = nextMap[k];
          delete nextMap[k];
          if (eid) {
            try {
              await calSdk.events.delete({ calendarId, eventId: eid });
              deleted++;
            } catch (e) {
              const st = e.response && e.response.status;
              if (e.code !== 404 && st !== 404) console.warn("calendar delete", e.message);
            }
          }
        }
        storedMaps.set(wsId, nextMap);
        await wsRef.set(
          {
            googleCalendarEventIds: nextMap,
            googleCalendarSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      await metaRef.set(
        {
          lastPushAt: admin.firestore.FieldValue.serverTimestamp(),
          lastPushStats: { created, updated, deleted, total: desired.size },
          eventIndex,
        },
        { merge: true }
      );

      return { ok: true, created, updated, deleted, total: desired.size, calendarId };
  }

  /**
   * Merge Google → Firestore for events we created (optional; use when you edited times in Google).
   */
  async function execPullWorkshops(request) {
      _assertCmsAdmin(request.auth);
      const { oauth2 } = await _getOAuthClient(db, REGION, projectId);
      await _ensureFreshAccessToken(db, oauth2);
      const calSdk = google.calendar({ version: "v3", auth: oauth2 });
      const meta = (await db.doc("siteSettings/googleCalendar").get()).data() || {};
      const calendarId = String(meta.targetCalendarId || "").trim();
      if (!calendarId) throw new HttpsError("failed-precondition", "Connect Google Calendar first.");

      const timeMin = new Date(Date.now() - 7 * 86400000).toISOString();
      const timeMax = new Date(Date.now() + 370 * 86400000).toISOString();
      let pageToken;
      let patched = 0;
      const updatesByWorkshop = new Map();

      const hkDateStr = (iso) => {
        const p = _isoToHkParts(iso);
        return `${p.y}年${p.mo}月${p.day}日`;
      };

      const hkTimeStr = (startIso, endIso) => {
        const ps = _isoToHkParts(startIso);
        const pe = _isoToHkParts(endIso);
        const pad = (n) => String(n).padStart(2, "0");
        return `${pad(ps.hh)}:${pad(ps.mm)} - ${pad(pe.hh)}:${pad(pe.mm)}`;
      };

      do {
        const list = await calSdk.events.list({
          calendarId,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 500,
          pageToken: pageToken || undefined,
        });
        const items = list.data.items || [];
        for (const ev of items) {
          const priv = ev.extendedProperties?.private || {};
          if (priv.aiflowSource !== AIFLOW_SOURCE || !priv.aiflowSyncKey) continue;
          const sk = String(priv.aiflowSyncKey);
          const start = ev.start?.dateTime || ev.start?.date;
          const end = ev.end?.dateTime || ev.end?.date;
          if (!start || !end) continue;
          const parts = sk.split("|");
          if (parts[0] !== SYNC_KEY_PREFIX || parts.length < 3) continue;
          const wsId = parts[1];
          const dateStr = hkDateStr(start);
          const timeStr = hkTimeStr(start, end);

          if (!updatesByWorkshop.has(wsId)) updatesByWorkshop.set(wsId, []);
          updatesByWorkshop.get(wsId).push({ sk, parts, dateStr, timeStr });
        }
        pageToken = list.data.nextPageToken;
      } while (pageToken);

      for (const [wsId, rows] of updatesByWorkshop.entries()) {
        const ref = db.collection("workshops").doc(wsId);
        const snap = await ref.get();
        if (!snap.exists) continue;
        const ws = snap.data() || {};
        let data = { ...ws };
        let changed = false;

        for (const row of rows) {
          const { parts, dateStr, timeStr } = row;
          if (parts[2] === "main") {
            if (data.date !== dateStr || data.time !== timeStr) {
              data.date = dateStr;
              data.time = timeStr;
              changed = true;
            }
            continue;
          }
          if (parts[2] === "s" && Array.isArray(data.sessions)) {
            const sid = parts[3];
            const idx = data.sessions.findIndex((s, i) =>
              s?.id ? String(s.id) === sid : `i${i}` === sid
            );
            if (idx >= 0) {
              const copy = { ...data.sessions[idx], date: dateStr, time: timeStr };
              if (copy.date !== data.sessions[idx].date || copy.time !== data.sessions[idx].time) {
                data.sessions = data.sessions.slice();
                data.sessions[idx] = copy;
                changed = true;
              }
            }
            continue;
          }
          if (parts[2] === "r" && Array.isArray(data.rounds) && parts[4] === "s") {
            const rid = parts[3];
            const sid = parts[5];
            const rounds = data.rounds.map((round, ri) => {
              const rrid = String(round?.id || `round${ri}`);
              if (rrid !== rid) return round;
              if (!Array.isArray(round.sessions)) return round;
              const nsessions = round.sessions.map((s, si) => {
                const match = s?.id ? String(s.id) === sid : `i${si}` === sid;
                if (!match) return s;
                return { ...s, date: dateStr, time: timeStr };
              });
              return { ...round, sessions: nsessions };
            });
            if (JSON.stringify(rounds) !== JSON.stringify(data.rounds)) {
              data.rounds = rounds;
              changed = true;
            }
          }
        }

        if (changed) {
          data.updatedAt = admin.firestore.FieldValue.serverTimestamp();
          await ref.set(data, { merge: true });
          patched++;
        }
      }

      await db.doc("siteSettings/googleCalendar").set(
        {
          lastPullAt: admin.firestore.FieldValue.serverTimestamp(),
          lastPullStats: { workshopsPatched: patched },
        },
        { merge: true }
      );

      return { ok: true, workshopsPatched: patched };
  }

  const cmsGoogleCalendarApi = onRequest(
    {
      region: REGION,
      cors: [
        "https://aiflowtime-hk.web.app",
        "https://aiflowtime-hk.firebaseapp.com",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
      ],
      secrets: [googleCalendarClientId, googleCalendarClientSecret],
      invoker: "public",
      timeoutSeconds: 300,
      memory: "512MiB",
    },
    async (req, res) => {
      try {
        if (req.method !== "POST") {
          res.status(405).json({ error: { message: "POST only", status: "INVALID_ARGUMENT" } });
          return;
        }
        const body = req.body && typeof req.body === "object" ? req.body : {};
        const payload = Object.prototype.hasOwnProperty.call(body, "data") ? body.data : body;
        const action = String((payload && payload.action) || "").trim();
        const authHeader = String(req.headers.authorization || "");
        const tm = authHeader.match(/^Bearer\s+(.+)$/i);
        if (!tm) {
          res.status(401).json({ error: { message: "Missing Authorization", status: "UNAUTHENTICATED" } });
          return;
        }
        let decoded;
        try {
          decoded = await admin.auth().verifyIdToken(tm[1]);
        } catch (_tokErr) {
          res.status(401).json({ error: { message: "Invalid ID token", status: "UNAUTHENTICATED" } });
          return;
        }
        const callableRequest = { auth: { uid: decoded.uid, token: decoded } };
        let result;
        if (action === "status") {
          result = await execGetStatus(callableRequest);
        } else if (action === "oauthUrl") {
          result = await execGetOAuthUrl(callableRequest);
        } else if (action === "disconnect") {
          result = await execDisconnect(callableRequest);
        } else if (action === "sync") {
          result = await execSyncWorkshops(callableRequest);
        } else if (action === "pull") {
          result = await execPullWorkshops(callableRequest);
        } else {
          res.status(400).json({
            error: {
              message:
                'Unknown action. Use body: { data: { action: "status"|"oauthUrl"|"disconnect"|"sync"|"pull" } }.',
              status: "INVALID_ARGUMENT",
            },
          });
          return;
        }
        res.status(200).json({ result });
      } catch (e) {
        const code = e && e.code;
        const isFnsHttps =
          e instanceof HttpsError ||
          (typeof code === "string" &&
            ["permission-denied", "failed-precondition", "invalid-argument", "not-found", "already-exists"].includes(
              code
            ));
        if (isFnsHttps) {
          const st =
            code === "permission-denied"
              ? 403
              : code === "failed-precondition" || code === "invalid-argument"
                ? 400
                : code === "not-found"
                  ? 404
                  : 500;
          res.status(st).json({ error: { message: e.message, status: code } });
          return;
        }
        console.error("cmsGoogleCalendarApi", e);
        res.status(500).json({ error: { message: e.message || "internal", status: "INTERNAL" } });
      }
    }
  );

  return {
    cmsGoogleCalendarApi,
    calendarOAuthCallback,
  };
}

module.exports = { registerGoogleCalendarIntegration };
