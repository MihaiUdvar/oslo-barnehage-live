#!/usr/bin/env node
// Fetches each barnehage's oslo.kommune.no page and extracts the main contact
// phone number (the first tel: link — the ones after it belong to individual
// avdelinger). Writes a `phone` column into barnehage_spots_2026.csv and
// regenerates barnehage_data.js. Node 18+ (native fetch).
const fs = require("fs");

const CSV_PATH = "barnehage_spots_2026.csv";
const DATA_JS_PATH = "barnehage_data.js";
const CONCURRENCY = 6;
const USER_AGENT = "Mozilla/5.0 (oslo-barnehage-2026; +https://github.com/tfreyd/oslo_barnehage_2026)";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cell);
      cell = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      continue;
    }

    cell += ch;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function quoteCsv(value) {
  const str = String(value == null ? "" : value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsv(rows) {
  return `${rows.map((r) => r.map(quoteCsv).join(",")).join("\n")}\n`;
}

function generateDataJs(rows, header) {
  const objects = rows.map((r) => {
    const obj = {};
    header.forEach((key, i) => {
      const raw = r[i] == null ? "" : String(r[i]);
      if (["spot_litenavdeling", "spot_storavdeling", "latitude", "longitude", "match_score", "name_match_score"].includes(key)) {
        const num = Number(raw);
        obj[key] = Number.isFinite(num) ? num : raw;
      } else {
        obj[key] = raw;
      }
    });
    return obj;
  });
  return `window.BARNEHAGE_ROWS = ${JSON.stringify(objects)};\n`;
}

// First tel: link on the page is the barnehage's main contact; later ones sit
// under the "Avdelinger" sections. Keep digits only (a leading + is preserved).
function extractMainPhone(html) {
  const m = html.match(/href="tel:([^"]+)"/);
  if (!m) return "";
  const digits = m[1].replace(/[^\d+]/g, "").replace(/^\+47/, "");
  return /^\d{8}$/.test(digits) ? digits : "";
}

async function fetchPhone(url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { "user-agent": USER_AGENT }, redirect: "follow" });
    if (!res.ok) return "";
    return extractMainPhone(await res.text());
  } catch {
    if (attempt >= 3) return "";
    await new Promise((r) => setTimeout(r, attempt * 1000));
    return fetchPhone(url, attempt + 1);
  }
}

async function main() {
  const csvText = fs.readFileSync(CSV_PATH, "utf8");
  const csvRows = parseCsv(csvText);
  if (!csvRows.length) throw new Error("CSV is empty");

  const header = csvRows[0].slice();
  const body = csvRows.slice(1);
  if (!header.includes("phone")) header.push("phone");
  const index = Object.fromEntries(header.map((k, i) => [k, i]));

  const rows = body.map((r) => header.map((_, i) => (r[i] == null ? "" : r[i])));

  // Multi-section barnehager share one URL — fetch each page only once.
  const urls = [...new Set(rows.map((r) => r[index.barnehage_url]).filter((u) => /^https?:\/\//i.test(u)))];
  console.log(`Rows: ${rows.length}, unique pages to fetch: ${urls.length}`);

  const phoneByUrl = new Map();
  let done = 0;
  let next = 0;
  async function worker() {
    while (next < urls.length) {
      const url = urls[next++];
      phoneByUrl.set(url, await fetchPhone(url));
      done += 1;
      if (done % 50 === 0 || done === urls.length) console.log(`Fetched ${done}/${urls.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  let withPhone = 0;
  for (const r of rows) {
    const phone = phoneByUrl.get(r[index.barnehage_url]) || "";
    r[index.phone] = phone;
    if (phone) withPhone += 1;
  }

  fs.writeFileSync(CSV_PATH, toCsv([header, ...rows]), "utf8");
  fs.writeFileSync(DATA_JS_PATH, generateDataJs(rows, header), "utf8");

  console.log(`Updated ${CSV_PATH} and ${DATA_JS_PATH}`);
  console.log(`Rows with phone: ${withPhone}/${rows.length}`);
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
