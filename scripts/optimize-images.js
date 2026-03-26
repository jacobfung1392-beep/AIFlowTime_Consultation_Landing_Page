const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = process.cwd();
const MIN_BYTES = 200 * 1024;
const LARGE_REVIEW_BYTES = 2 * 1024 * 1024;
const VALID_EXTS = new Set([".jpg", ".jpeg", ".png"]);
const SKIP_DIRS = new Set(["node_modules", ".git"]);

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
  return bytes + " B";
}

function shouldSkipDir(dirName, relPath) {
  if (SKIP_DIRS.has(dirName)) return true;
  if (relPath.startsWith("functions/node_modules")) return true;
  return false;
}

function walk(dir, base = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];

  for (const entry of entries) {
    const relPath = base ? path.posix.join(base, entry.name) : entry.name;
    const absPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name, relPath)) continue;
      files = files.concat(walk(absPath, relPath));
      continue;
    }

    files.push({ absPath, relPath });
  }

  return files;
}

async function convertOne(file) {
  const ext = path.extname(file.relPath).toLowerCase();
  if (!VALID_EXTS.has(ext)) return null;

  const stat = fs.statSync(file.absPath);
  if (stat.size <= MIN_BYTES) return null;

  const webpPath = file.absPath.replace(/\.(png|jpg|jpeg)$/i, ".webp");
  const webpRel = file.relPath.replace(/\.(png|jpg|jpeg)$/i, ".webp");
  const transformer = sharp(file.absPath).rotate();

  if (ext === ".png") {
    await transformer.webp({ quality: 82, effort: 6 }).toFile(webpPath);
  } else {
    await transformer.webp({ quality: 78, effort: 6 }).toFile(webpPath);
  }

  const webpSize = fs.statSync(webpPath).size;
  return {
    original: file.relPath,
    webp: webpRel,
    originalBytes: stat.size,
    webpBytes: webpSize,
    flagged: stat.size > LARGE_REVIEW_BYTES,
  };
}

async function main() {
  const files = walk(ROOT);
  const conversions = [];

  for (const file of files) {
    const result = await convertOne(file);
    if (result) conversions.push(result);
  }

  conversions.sort((a, b) => b.originalBytes - a.originalBytes);

  let saved = 0;
  console.log("Converted images:");
  for (const item of conversions) {
    const diff = item.originalBytes - item.webpBytes;
    saved += diff;
    console.log(
      `${item.original} -> ${item.webp} | ${formatBytes(item.originalBytes)} -> ${formatBytes(item.webpBytes)} | saved ${formatBytes(diff)}`
    );
  }

  console.log(`\nTotal converted: ${conversions.length}`);
  console.log(`Total estimated savings if originals are excluded from deploy: ${formatBytes(saved)}`);

  const flagged = conversions.filter((item) => item.flagged);
  if (flagged.length) {
    console.log("\nReview requested (>2 MB originals):");
    for (const item of flagged) {
      console.log(`- ${item.original} (${formatBytes(item.originalBytes)})`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
