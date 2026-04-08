#!/usr/bin/env node
/**
 * Sign and POST to upsertCarousel (OpenClaw / local testing).
 *
 * Prerequisites:
 *   - firebase functions:secrets:set HMAC_SECRET  (same value locally)
 *   - firebase deploy --only functions:upsertCarousel
 *
 * Usage (single slide):
 *   export HMAC_SECRET='your-hex-secret'
 *   npm run carousel:trigger -- --name Sam Altman test --headline "標題" --body "內文"
 *   (Words after --name / --headline / --body / --label join until the next --flag,
 *    so you usually do NOT need quotes on zsh/npm.)
 *
 * Multi-slide (one Firestore project):
 *   npm run carousel:trigger -- --deck-json ./scripts/examples/sam-altman-deck.json
 *
 * Optional env:
 *   CAROUSEL_WEBHOOK_URL  (default: asia-east2 aiflowtime-hk upsertCarousel)
 *
 * Flags:
 *   --url, --template, --name, --idempotency, --label, --headline, --body,
 *   --payload-json <path>, --deck-json <path>
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DEFAULT_WEBHOOK_URL =
  "https://asia-east2-aiflowtime-hk.cloudfunctions.net/upsertCarousel";

function loadDotEnvFiles() {
  const root = path.join(__dirname, "..");
  for (const name of [".env.local", ".env"]) {
    const p = path.join(root, name);
    try {
      const raw = fs.readFileSync(p, "utf8");
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq <= 0) continue;
        const k = trimmed.slice(0, eq).trim();
        let v = trimmed.slice(eq + 1).trim();
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        ) {
          v = v.slice(1, -1);
        }
        if (process.env[k] === undefined) process.env[k] = v;
      }
    } catch {
      // missing file is fine
    }
  }
}

/** Collect argv tokens until the next `--letter…` flag (npm/npm eats quotes; this avoids broken --name). */
function takeGreedyUntilNextFlag(argv, startIdx) {
  const parts = [];
  let i = startIdx;
  while (i < argv.length) {
    const t = argv[i];
    if (t.startsWith("--") && /^--[a-zA-Z]/.test(t)) break;
    parts.push(t);
    i++;
  }
  return { value: parts.join(" ").trim(), nextIndex: i };
}

function parseArgs(argv) {
  const out = {
    url: process.env.CAROUSEL_WEBHOOK_URL || DEFAULT_WEBHOOK_URL,
    templateId: "titleGold",
    name: "",
    idempotencyKey: "",
    label: "",
    headline: "",
    body: "",
    payloadJsonPath: "",
    deckJsonPath: "",
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`Missing value after ${a}`);
      return v;
    };

    if (a === "--name" || a === "--label" || a === "--headline" || a === "--body") {
      const { value, nextIndex } = takeGreedyUntilNextFlag(argv, i + 1);
      i = nextIndex - 1;
      if (a === "--name") out.name = value;
      else if (a === "--label") out.label = value;
      else if (a === "--headline") out.headline = value;
      else out.body = value;
      continue;
    }

    switch (a) {
      case "--url":
        out.url = next();
        break;
      case "--template":
        out.templateId = next();
        break;
      case "--idempotency":
        out.idempotencyKey = next();
        break;
      case "--payload-json":
        out.payloadJsonPath = next();
        break;
      case "--deck-json":
        out.deckJsonPath = next();
        break;
      case "--help":
      case "-h":
        out.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${a}`);
    }
  }
  return out;
}

async function main() {
  loadDotEnvFiles();

  let args;
  try {
    args = parseArgs(process.argv);
  } catch (e) {
    console.error(e.message || String(e));
    process.exit(1);
  }

  if (args.help) {
    console.log(`Usage:
  export HMAC_SECRET='...'
  npm run carousel:trigger -- --name Sam Altman test --headline 標題 --body 內文
  npm run carousel:trigger -- --deck-json ./scripts/examples/sam-altman-deck.json

Greedy flags: text after --name/--headline/--body/--label runs until the next --flag (helps npm quote hygiene).

Env: HMAC_SECRET (required), CAROUSEL_WEBHOOK_URL (optional)`);
    process.exit(0);
  }

  const secret = process.env.HMAC_SECRET;
  if (!secret) {
    console.error(
      "HMAC_SECRET is required (env or .env / .env.local). Do not commit it."
    );
    process.exit(1);
  }

  const idempotencyKey =
    args.idempotencyKey || crypto.randomUUID();

  let bodyObj;

  if (args.deckJsonPath) {
    const deck = JSON.parse(
      fs.readFileSync(path.resolve(args.deckJsonPath), "utf8")
    );
    const dname =
      (typeof deck.name === "string" && deck.name.trim()) ||
      (args.name && args.name.trim()) ||
      undefined;
    const did =
      (typeof deck.idempotencyKey === "string" && deck.idempotencyKey.trim()) ||
      idempotencyKey;
    const slides = deck.slides || deck.slidesSpec;
    if (!Array.isArray(slides) || slides.length === 0) {
      throw new Error("--deck-json must contain slides or slidesSpec (non-empty array)");
    }
    const slidesSpec = slides.map((row, idx) => {
      if (!row || typeof row !== "object") {
        throw new Error(`deck.slides[${idx}] invalid`);
      }
      const templateId =
        row.templateId || deck.defaultTemplateId || "titleGold";
      return {
        templateId,
        payload:
          row.payload && typeof row.payload === "object" ? row.payload : {},
      };
    });
    bodyObj = {
      idempotencyKey: did,
      name: dname,
      slidesSpec,
    };
  } else {
    const payload = {};
    if (args.payloadJsonPath) {
      const merged = JSON.parse(
        fs.readFileSync(path.resolve(args.payloadJsonPath), "utf8")
      );
      if (merged === null || typeof merged !== "object" || Array.isArray(merged)) {
        throw new Error("--payload-json must point to a JSON object");
      }
      Object.assign(payload, merged);
    }
    if (args.label) payload.label = args.label;
    if (args.headline) payload.headline = args.headline;
    if (args.body) payload.body = args.body;

    bodyObj = {
      idempotencyKey,
      templateId: args.templateId,
      name: args.name || undefined,
      payload,
    };
  }

  const body = JSON.stringify(bodyObj);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("hex");

  const res = await fetch(args.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-openclaw-signature": signature,
    },
    body,
  });

  const text = await res.text();
  console.log(res.status, text);
  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
