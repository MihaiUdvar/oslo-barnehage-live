// Scrapes the live "ledige barnehageplasser" page and writes barnehage_live_data.js,
// the snapshot the app falls back to when the Netlify function is unavailable
// (e.g. local dev with python http.server). Run: node scrape_ledige_plasser.mjs
import { writeFileSync } from "node:fs";
import { parseLedigePlasser } from "./ledige_parser.mjs";

const SOURCE = "https://www.oslo.kommune.no/barnehage/ledige-barnehageplasser/";

const res = await fetch(SOURCE, {
  headers: { "user-agent": "Mozilla/5.0 (oslo-barnehage-2026; +https://github.com/tfreyd/oslo_barnehage_2026)" },
});
if (!res.ok) {
  console.error(`Upstream responded ${res.status}`);
  process.exit(1);
}

const html = await res.text();
const data = {
  fetched_at: new Date().toISOString(),
  source: SOURCE,
  snapshot: true,
  bydeler: parseLedigePlasser(html),
};

writeFileSync("barnehage_live_data.js", `window.BARNEHAGE_LIVE = ${JSON.stringify(data, null, 1)};\n`);

const total = Object.values(data.bydeler).reduce((s, b) => s + b.entries.length, 0);
console.log(`Wrote barnehage_live_data.js (${Object.keys(data.bydeler).length} bydeler, ${total} entries)`);
