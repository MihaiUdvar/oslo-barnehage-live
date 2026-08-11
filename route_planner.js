const ui = {
  startPoint: document.getElementById("startPoint"),
  bydelSelect: document.getElementById("bydelSelect"),
  buildBtn: document.getElementById("buildBtn"),
  shareBtn: document.getElementById("shareBtn"),
  routeError: document.getElementById("routeError"),
  routeWarning: document.getElementById("routeWarning"),
  routeInfo: document.getElementById("routeInfo"),
  liveStatus: document.getElementById("liveStatus"),
  savedRoutes: document.getElementById("savedRoutes"),
  savedRoutesList: document.getElementById("savedRoutesList"),
  resultsHeading: document.getElementById("resultsHeading"),
  mapsExport: document.getElementById("mapsExport"),
  results: document.getElementById("results")
};

let allRows = [];
let rowByKey = new Map();
let rowIndexByKey = new Map();
let liveByUrl = new Map();
let liveDates = new Map();
let liveAvailable = false;

function parseCSV(text) {
  const rows = [];
  let cur = "";
  let line = [];
  let out = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) { line.push(cur); cur = ""; continue; }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      line.push(cur); cur = "";
      if (line.some(v => v !== "")) out.push(line);
      line = [];
      continue;
    }
    cur += ch;
  }
  if (cur.length || line.length) { line.push(cur); out.push(line); }

  const headers = out[0] || [];
  for (let i = 1; i < out.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = out[i][j] ?? "";
    rows.push(obj);
  }
  return rows;
}

async function loadRows() {
  if (Array.isArray(window.BARNEHAGE_ROWS) && window.BARNEHAGE_ROWS.length) {
    return window.BARNEHAGE_ROWS;
  }
  try {
    const res = await fetch("./barnehage_spots_2026.csv");
    if (res.ok) return parseCSV(await res.text());
  } catch {
    // Ignore fetch errors (e.g. file:// without server)
  }
  return [];
}

function escapeHtml(value) {
  const str = value == null ? "" : String(value);
  return str.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function isSafeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /^https?:\/\//i.test(url);
}

function getBarnehagefaktaUrl(row) {
  return isSafeUrl(row.barnehagefakta_url) ? row.barnehagefakta_url : null;
}

function normalizeUrl(url) {
  return typeof url === "string" ? url.replace(/\/+$/, "") : "";
}

// Fetch currently announced availability: Netlify function first, embedded
// snapshot as fallback (e.g. a plain local server without Netlify functions).
async function ensureLiveData() {
  let data = null;
  try {
    const res = await fetch("/.netlify/functions/ledige-plasser");
    if (res.ok) data = await res.json();
  } catch {
    // Ignore; fall back to snapshot
  }
  if (!data || !data.bydeler) data = window.BARNEHAGE_LIVE;
  if (!data || !data.bydeler) return false;

  for (const [bydel, info] of Object.entries(data.bydeler)) {
    liveDates.set(bydel, info.updated || "");
    for (const entry of info.entries || []) {
      const key = normalizeUrl(entry.url);
      const prev = liveByUrl.get(key) || { liten: 0, stor: 0 };
      liveByUrl.set(key, {
        liten: prev.liten + Number(entry.liten || 0),
        stor: prev.stor + Number(entry.stor || 0)
      });
    }
  }
  return true;
}

// Currently announced availability only — no fallback to expected (PDF) capacity.
// Returns null when this barnehage has no live entry right now.
function liveSpotsFor(row) {
  return liveByUrl.get(normalizeUrl(row.barnehage_url)) || null;
}

function liveUpdatedText(row) {
  if (!liveAvailable) return "";
  const date = liveDates.get(row.bydel);
  return date ? `Sist oppdatert: ${date}` : "";
}

function buildAddressHtml(r) {
  const address = r.address || "";
  if (!address) return "";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return `<a class="addr-link" href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener">${escapeHtml(address)}</a>`;
}

function buildLinkHtml(row) {
  const osloUrl = row.barnehage_url;
  const faktaUrl = getBarnehagefaktaUrl(row);
  let html = "";
  if (osloUrl && isSafeUrl(osloUrl)) {
    html += `<a class="btn" href="${escapeHtml(osloUrl)}" target="_blank" rel="noopener">Oslo kommune</a> `;
  }
  if (faktaUrl) {
    html += `<a class="btn" href="${escapeHtml(faktaUrl)}" target="_blank" rel="noopener">Barnehagefakta</a>`;
  }
  return html;
}

// Distance label per display mode. Tour modes measure each leg from the previous
// stop; legacy "fromStart" modes (older saved routes) measure from the start point.
function distanceLabelFor(mode, orderIndex, distanceKm) {
  const km = distanceKm.toFixed(1);
  const from = orderIndex === 0 ? "fra startpunkt" : "fra forrige stopp";
  switch (mode) {
    case "tour-walk": return `${km} km ${from} (gange via vei)`;
    case "tour-air": return `${km} km ${from} (luftlinje)`;
    case "fromStart-walk": return `${km} km gangavstand`;
    default: return `${km} km luftlinje fra startpunkt`;
  }
}

// Same card markup as the main app's result list, plus a route order badge and distance line.
// Cards with no currently-announced live spots get a light red background instead of
// falling back to expected (PDF) capacity numbers.
function buildCardHtml(row, orderIndex, distanceKm, mode) {
  const link = buildLinkHtml(row);
  const s = liveSpotsFor(row);
  const addressHtml = buildAddressHtml(row) || "-";
  const distanceLabel = distanceLabelFor(mode, orderIndex, distanceKm);
  const updated = liveUpdatedText(row);
  const updatedHtml = updated ? `<div class="meta live-updated">${escapeHtml(updated)}</div>` : "";
  const spotsChips = s
    ? `<span class="chip">Liten: ${escapeHtml(String(s.liten))}</span><span class="chip">Stor: ${escapeHtml(String(s.stor))}</span>`
    : `<span class="chip chip-no-live">Ingen ledige plasser oppgitt</span>`;

  const key = routeKey(row);
  const note = notesCache[key] || {};

  return `
    <article class="card${s ? "" : " card-no-live"}" data-key="${escapeHtml(key)}">
      <h3>${escapeHtml(row.barnehage)}</h3>
      <div class="chips">
        <span class="chip chip-order">#${orderIndex + 1}</span>
        <span class="chip">${escapeHtml(row.bydel)}</span>
        ${spotsChips}
      </div>
      <div class="meta route-distance">${distanceLabel}</div>
      ${updatedHtml}
      <div class="meta">Adresse: ${addressHtml}</div>
      <div>${link}</div>
      <div class="note-row">
        <textarea class="note-input" rows="2" placeholder="Notat etter besøk...">${escapeHtml(note.note || "")}</textarea>
      </div>
    </article>
  `;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isValidLatLon(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

// Public OSRM demo server: no API key, but it only actually hosts a road/driving
// network, so a requested "foot" profile falls back to the same road distances.
// The /trip service solves the visiting-order problem (open TSP from a fixed
// start), which is what a one-bydel-per-day visit plan actually needs.
// greedyAirTour() below is the fallback if the demo server is unreachable.
const OSRM_TRIP_URL = "https://router.project-osrm.org/trip/v1/foot/";

// Returns candidates in optimized visit order, each with `dist` = km from the
// previous stop (the first from the start point). Null if OSRM is unavailable.
async function fetchWalkingTour(point, candidates) {
  if (!candidates.length) return [];
  const coords = [point, ...candidates].map(p => `${p.lon},${p.lat}`).join(";");
  const url = `${OSRM_TRIP_URL}${coords}?source=first&roundtrip=false`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !Array.isArray(data.trips) || !data.trips[0] || !Array.isArray(data.waypoints)) return null;
    if (data.waypoints.length !== candidates.length + 1) return null;

    // waypoints[i].waypoint_index = position of input coordinate i in the trip;
    // trips[0].legs[k] = leg from trip position k to k+1.
    const legsKm = data.trips[0].legs.map(l => l.distance / 1000);
    const ordered = candidates
      .map((item, i) => ({ ...item, tourPos: data.waypoints[i + 1].waypoint_index }))
      .sort((a, b) => a.tourPos - b.tourPos)
      .map(item => ({ ...item, dist: legsKm[item.tourPos - 1] }));
    if (ordered.some(it => !Number.isFinite(it.dist))) return null;
    return ordered;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Offline fallback: greedy nearest-neighbor tour on straight-line distances.
function greedyAirTour(point, candidates) {
  const remaining = [...candidates];
  const ordered = [];
  let cur = point;
  while (remaining.length) {
    let bestIdx = 0;
    let bestD = Infinity;
    remaining.forEach((c, i) => {
      const d = haversineKm(cur.lat, cur.lon, c.lat, c.lon);
      if (d < bestD) { bestD = d; bestIdx = i; }
    });
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push({ ...next, dist: bestD });
    cur = next;
  }
  return ordered;
}

// Accepts a full Google Maps URL (place pin, map center, or q=/ll= search link) or a plain "lat,lng" pair.
function parseStartPoint(text) {
  const s = (text || "").trim();
  if (!s) return null;

  let m = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (m && isValidLatLon(Number(m[1]), Number(m[2]))) return { lat: Number(m[1]), lon: Number(m[2]) };

  m = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m && isValidLatLon(Number(m[1]), Number(m[2]))) return { lat: Number(m[1]), lon: Number(m[2]) };

  m = s.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m && isValidLatLon(Number(m[1]), Number(m[2]))) return { lat: Number(m[1]), lon: Number(m[2]) };

  m = s.match(/^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (m && isValidLatLon(Number(m[1]), Number(m[2]))) return { lat: Number(m[1]), lon: Number(m[2]) };

  return null;
}

function showError(message) {
  ui.routeError.textContent = message;
  ui.routeError.style.display = "block";
}

function hideError() {
  ui.routeError.style.display = "none";
}

function showWarning(message) {
  ui.routeWarning.textContent = message;
  ui.routeWarning.style.display = "block";
}

function hideWarning() {
  ui.routeWarning.style.display = "none";
}

function showInfo(message) {
  ui.routeInfo.textContent = message;
  ui.routeInfo.style.display = "block";
}

function hideInfo() {
  ui.routeInfo.style.display = "none";
}

function loadBydeler(rows) {
  const bydeler = [...new Set(rows.map(r => r.bydel).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  for (const b of bydeler) {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    ui.bydelSelect.appendChild(opt);
  }
}

function renderResults(items, bydel, mode, startPoint) {
  ui.resultsHeading.style.display = "block";
  ui.shareBtn.style.display = items.length ? "inline-block" : "none";

  if (!items.length) {
    ui.resultsHeading.textContent = `0 barnehager i ${bydel}`;
    ui.mapsExport.style.display = "none";
    ui.mapsExport.innerHTML = "";
    ui.results.innerHTML = `<div class="empty">Fant ingen barnehager med kjent posisjon i denne bydelen.</div>`;
    return;
  }

  if (mode === "tour-walk" || mode === "tour-air") {
    const totalKm = items.reduce((s, it) => s + it.dist, 0);
    const how = mode === "tour-walk" ? "gange via vei" : "luftlinje";
    ui.resultsHeading.textContent = `${items.length} barnehager i ${bydel} i besøksrekkefølge – total rute ${totalKm.toFixed(1)} km (${how})`;
  } else {
    const sortLabel = mode === "fromStart-walk" ? "gangavstand" : "luftlinjeavstand";
    ui.resultsHeading.textContent = `${items.length} barnehager i ${bydel}, sortert etter ${sortLabel}`;
  }

  const mapsLinks = buildGoogleMapsLinks(items, startPoint || null);
  ui.mapsExport.innerHTML = mapsLinks
    .map(l => `<a class="btn" href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`)
    .join("");
  ui.mapsExport.style.display = "flex";

  notesCache = loadNotes();
  ui.results.innerHTML = items.map((item, idx) => buildCardHtml(item.row, idx, item.dist, mode)).join("");
}

// --- Field notes per barnehage (localStorage) ----------------------------------
// Keyed by barnehage identity (routeKey), NOT by route: a note like "ask for
// Kari" belongs to the place and must survive routes being rebuilt or deleted.
// Per-device only — no backend, works offline.
const NOTES_KEY = "barnehage_notes_v1";
let notesCache = {};

function loadNotes() {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    const notes = raw ? JSON.parse(raw) : null;
    if (notes && typeof notes === "object") return notes;
  } catch {
    // Corrupt JSON or storage unavailable — start fresh.
  }
  return {};
}

function persistNotes(notes) {
  // Prune empty entries so abandoned notes don't accumulate forever.
  for (const [key, val] of Object.entries(notes)) {
    if (!val || (!val.rating && !val.note)) delete notes[key];
  }
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch {
    // Storage full or unavailable; the note still works for this session.
  }
}

// --- Google Maps export ---------------------------------------------------------
// One directions link per segment of 10 stops (Maps' URL API caps waypoints at 9;
// origin + 9 waypoints + destination = 10 new stops per link). Each segment starts
// where the previous one ended, so the links chain into the full day tour.
function itemCoord(item) {
  const lat = Number(item.row.latitude);
  const lon = Number(item.row.longitude);
  return `${lat.toFixed(6)},${lon.toFixed(6)}`;
}

function buildGoogleMapsLinks(items, startPoint) {
  const links = [];
  const STOPS_PER_LINK = 10;
  for (let i = 0; i < items.length; i += STOPS_PER_LINK) {
    const chunk = items.slice(i, i + STOPS_PER_LINK);
    const destination = itemCoord(chunk[chunk.length - 1]);
    const waypoints = chunk.slice(0, -1).map(itemCoord).join("|");
    const origin = i === 0
      ? (startPoint && isValidLatLon(startPoint.lat, startPoint.lon) ? `${startPoint.lat.toFixed(6)},${startPoint.lon.toFixed(6)}` : null)
      : itemCoord(items[i - 1]);

    const params = new URLSearchParams({ api: "1", destination, travelmode: "walking" });
    if (origin) params.set("origin", origin);
    if (waypoints) params.set("waypoints", waypoints);

    const label = items.length <= STOPS_PER_LINK
      ? "Åpne ruten i Google Maps"
      : `Google Maps del ${links.length + 1} (stopp ${i + 1}–${i + chunk.length})`;
    links.push({ label, url: `https://www.google.com/maps/dir/?${params.toString()}` });
  }
  return links;
}

// --- Saved routes (localStorage) ---------------------------------------------
// One saved route per bydel: the user visits one bydel per day and reopens the
// page on their phone throughout the day, so the last built route must survive
// browser restarts. Rows are stored as barnehage-URL references, not full
// objects, so cards always re-render with the freshest live availability.
const STORAGE_KEY = "barnehage_route_planner_v1";

// Composite identity for a row. The oslo.kommune.no URL alone is not unique —
// multi-section barnehager (e.g. two buildings) share one URL, so include name
// and address. Rows that are fully identical in the source data intentionally
// collapse into one entry: for a visit route you only go there once.
function routeKey(row) {
  return `${normalizeUrl(row.barnehage_url)}|${row.barnehage || ""}|${row.address || ""}`;
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const store = raw ? JSON.parse(raw) : null;
    if (store && typeof store === "object" && store.routes && typeof store.routes === "object") return store;
  } catch {
    // Corrupt JSON or storage unavailable (e.g. private mode) — start fresh.
  }
  return { routes: {} };
}

function persistStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage full or unavailable; the route still works for this session.
  }
}

function saveRoute(bydel, startText, mode, items, point) {
  const store = loadStore();
  store.routes[bydel] = {
    startText,
    mode,
    point: point && isValidLatLon(point.lat, point.lon) ? { lat: point.lat, lon: point.lon } : null,
    savedAt: new Date().toISOString(),
    items: items.map(it => ({ key: routeKey(it.row), dist: it.dist }))
  };
  store.lastBydel = bydel;
  persistStore(store);
  renderSavedRoutes();
}

function deleteRoute(bydel) {
  const store = loadStore();
  delete store.routes[bydel];
  if (store.lastBydel === bydel) delete store.lastBydel;
  persistStore(store);
  renderSavedRoutes();
}

// Re-render a stored route. Distances were computed when the route was built;
// spot counts come from today's live data at render time.
function restoreRoute(bydel) {
  const store = loadStore();
  const saved = store.routes[bydel];
  if (!saved || !Array.isArray(saved.items)) return false;

  const items = saved.items
    .map(s => {
      const row = rowByKey.get(s.key);
      return row && Number.isFinite(s.dist) ? { row, dist: s.dist } : null;
    })
    .filter(Boolean);
  if (!items.length) return false;

  ui.startPoint.value = saved.startText || "";
  ui.bydelSelect.value = bydel;
  if (store.lastBydel !== bydel) {
    store.lastBydel = bydel;
    persistStore(store);
  }
  hideError();
  hideWarning();
  // Routes saved before tour ordering carry isWalking instead of mode.
  const mode = saved.mode || (saved.isWalking ? "fromStart-walk" : "fromStart-air");
  // Older saved routes lack point; the start text may still be parseable locally.
  const point = saved.point && isValidLatLon(saved.point.lat, saved.point.lon)
    ? saved.point
    : parseStartPoint(saved.startText);
  renderResults(items, bydel, mode, point);
  renderSavedRoutes();
  return true;
}

function renderSavedRoutes() {
  const store = loadStore();
  const bydeler = Object.keys(store.routes).sort((a, b) => a.localeCompare(b));
  if (!bydeler.length) {
    ui.savedRoutes.style.display = "none";
    ui.savedRoutesList.innerHTML = "";
    return;
  }
  ui.savedRoutes.style.display = "block";
  ui.savedRoutesList.innerHTML = bydeler.map(b => {
    const saved = store.routes[b];
    const date = saved.savedAt ? new Date(saved.savedAt).toLocaleDateString("no-NO", { day: "numeric", month: "short" }) : "";
    const active = store.lastBydel === b ? " active" : "";
    return `
      <span class="saved-route${active}">
        <button type="button" class="saved-route-load" data-bydel="${escapeHtml(b)}">${escapeHtml(b)}${date ? ` <small>(${escapeHtml(date)})</small>` : ""}</button>
        <button type="button" class="saved-route-delete" data-bydel="${escapeHtml(b)}" aria-label="Slett rute for ${escapeHtml(b)}">×</button>
      </span>
    `;
  }).join("");
}

// --- Shareable route URLs ------------------------------------------------------
// The displayed route is encoded into the URL hash so one parent can build it and
// send the link to the other. Rows are referenced by their index in the dataset
// (compact), so a link is only valid against the same deployed dataset — if the
// data has been regenerated since, the import fails loudly instead of showing
// wrong barnehager, and the receiver asks for a fresh link.
function base64UrlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str) {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function buildShareUrl() {
  const store = loadStore();
  const bydel = store.lastBydel;
  const saved = bydel ? store.routes[bydel] : null;
  if (!saved || !Array.isArray(saved.items) || !saved.items.length) return null;

  const x = [];
  const d = [];
  for (const it of saved.items) {
    const idx = rowIndexByKey.get(it.key);
    if (idx == null || !Number.isFinite(it.dist)) return null;
    x.push(idx);
    d.push(Math.round(it.dist * 100) / 100);
  }
  const payload = {
    v: 1,
    b: bydel,
    m: saved.mode || "tour-walk",
    t: (saved.startText || "").slice(0, 300),
    x,
    d
  };
  if (saved.point && isValidLatLon(saved.point.lat, saved.point.lon)) {
    payload.s = [Math.round(saved.point.lat * 1e6) / 1e6, Math.round(saved.point.lon * 1e6) / 1e6];
  }
  return `${location.origin}${location.pathname}#r=${base64UrlEncode(JSON.stringify(payload))}`;
}

async function shareRoute() {
  hideError();
  const url = buildShareUrl();
  if (!url) {
    showError("Ingen rute å dele ennå. Lag en rute først.");
    return;
  }

  // Native share sheet on mobile; clipboard on desktop; prompt as last resort.
  if (navigator.share) {
    try {
      await navigator.share({ title: "Barnehagerute", url });
      return;
    } catch {
      // User cancelled or share failed — fall through to clipboard.
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    const original = ui.shareBtn.textContent;
    ui.shareBtn.textContent = "Lenke kopiert!";
    setTimeout(() => { ui.shareBtn.textContent = original; }, 2000);
  } catch {
    window.prompt("Kopier lenken:", url);
  }
}

const VALID_MODES = new Set(["tour-walk", "tour-air", "fromStart-walk", "fromStart-air"]);

// Import a route from the URL hash. Returns true if a route was shown.
function importRouteFromHash() {
  const m = (location.hash || "").match(/[#&]r=([A-Za-z0-9_-]+)/);
  if (!m) return false;

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(m[1]));
  } catch {
    showError("Den delte lenken kunne ikke leses.");
    return false;
  }

  const ok = payload && payload.v === 1 &&
    typeof payload.b === "string" && payload.b &&
    Array.isArray(payload.x) && Array.isArray(payload.d) &&
    payload.x.length > 0 && payload.x.length === payload.d.length;
  if (!ok) {
    showError("Den delte lenken kunne ikke leses.");
    return false;
  }

  const items = payload.x.map((idx, i) => {
    const row = Number.isInteger(idx) ? allRows[idx] : null;
    const dist = Number(payload.d[i]);
    return row && row.bydel === payload.b && Number.isFinite(dist) ? { row, dist } : null;
  });
  if (items.some(it => !it)) {
    showError("Den delte ruten passer ikke med dagens data – be om en ny lenke.");
    return false;
  }

  const mode = VALID_MODES.has(payload.m) ? payload.m : "tour-walk";
  const point = Array.isArray(payload.s) && isValidLatLon(Number(payload.s[0]), Number(payload.s[1]))
    ? { lat: Number(payload.s[0]), lon: Number(payload.s[1]) }
    : null;
  ui.startPoint.value = payload.t || "";
  ui.bydelSelect.value = payload.b;
  renderResults(items, payload.b, mode, point);
  saveRoute(payload.b, payload.t || "", mode, items, point);

  // Drop the hash so a reload doesn't re-import over later changes.
  history.replaceState(null, "", location.pathname + location.search);
  showInfo(`Delt rute for ${payload.b} er importert og lagret på denne enheten.`);
  return true;
}

const SHORT_LINK_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"]);

// maps.app.goo.gl links redirect server-side; a browser can't read a cross-origin
// redirect target itself, so ask the Netlify function to follow it and return coordinates.
async function resolveShortLink(rawUrl) {
  const res = await fetch(`/.netlify/functions/resolve-maps-link?url=${encodeURIComponent(rawUrl)}`);
  const data = await res.json().catch(() => null);
  if (res.ok && data && isValidLatLon(data.lat, data.lon)) {
    return { lat: data.lat, lon: data.lon };
  }
  return null;
}

// Returns { point } on success, or { point: null, isShortLink } so the caller can
// give a more specific error when a recognized short link failed to resolve.
async function resolveStartPoint(text) {
  const s = (text || "").trim();
  const local = parseStartPoint(s);
  if (local) return { point: local, isShortLink: false };

  let url;
  try {
    url = new URL(s);
  } catch {
    return { point: null, isShortLink: false };
  }
  if (!SHORT_LINK_HOSTS.has(url.hostname)) return { point: null, isShortLink: false };

  try {
    const point = await resolveShortLink(s);
    return { point, isShortLink: true };
  } catch {
    return { point: null, isShortLink: true };
  }
}

async function buildRoute() {
  hideError();
  hideWarning();
  hideInfo();
  const bydel = ui.bydelSelect.value;

  ui.buildBtn.disabled = true;
  const originalLabel = ui.buildBtn.textContent;
  ui.buildBtn.textContent = "Løser lenke...";
  const { point, isShortLink } = await resolveStartPoint(ui.startPoint.value);

  if (!point && !bydel) {
    ui.buildBtn.disabled = false;
    ui.buildBtn.textContent = originalLabel;
    showError("Skriv inn et startpunkt og velg en bydel.");
    return;
  }
  if (!point) {
    ui.buildBtn.disabled = false;
    ui.buildBtn.textContent = originalLabel;
    if (isShortLink) {
      showError("Kunne ikke løse den forkortede lenken. Prøv å lime inn den fulle Google Maps-adressen i stedet, eller skriv inn \"breddegrad,lengdegrad\".");
    } else {
      showError("Kunne ikke lese startpunktet. Lim inn en Google Maps-lenke (forkortede maps.app.goo.gl-lenker fungerer også), eller skriv inn \"breddegrad,lengdegrad\".");
    }
    return;
  }
  if (!bydel) {
    ui.buildBtn.disabled = false;
    ui.buildBtn.textContent = originalLabel;
    showError("Velg en bydel.");
    return;
  }

  const candidates = allRows
    .filter(r => r.bydel === bydel)
    .map(row => ({ row, lat: Number(row.latitude), lon: Number(row.longitude) }))
    .filter(item => isValidLatLon(item.lat, item.lon));

  ui.buildBtn.textContent = "Beregner rute...";
  const tour = await fetchWalkingTour(point, candidates);
  ui.buildBtn.disabled = false;
  ui.buildBtn.textContent = originalLabel;

  let items;
  let mode;
  if (tour) {
    items = tour;
    mode = "tour-walk";
  } else {
    items = greedyAirTour(point, candidates);
    mode = "tour-air";
    if (candidates.length) {
      showWarning("Kunne ikke beregne gangrute via kart akkurat nå. Viser besøksrekkefølge basert på luftlinje i stedet.");
    }
  }

  renderResults(items, bydel, mode, point);
  saveRoute(bydel, ui.startPoint.value.trim(), mode, items, point);
}

async function init() {
  allRows = await loadRows();
  if (!Array.isArray(allRows) || !allRows.length) {
    showError("Fant ingen data å bygge rute fra.");
    return;
  }
  loadBydeler(allRows);

  rowByKey = new Map();
  rowIndexByKey = new Map();
  allRows.forEach((row, i) => {
    const key = routeKey(row);
    rowByKey.set(key, row);
    rowIndexByKey.set(key, i);
  });

  ui.liveStatus.textContent = "Henter sanntidsdata...";
  let liveError = null;
  try {
    liveAvailable = await ensureLiveData();
  } catch (err) {
    liveAvailable = false;
    liveError = err;
  }
  if (liveAvailable) {
    const total = [...liveByUrl.values()].reduce((n, v) => n + v.liten + v.stor, 0);
    ui.liveStatus.textContent = `Sanntidsdata lastet: ${liveByUrl.size} barnehager har oppgitte ledige plasser nå (totalt ${total} plasser). Barnehager uten oppgitte plasser vises med rød bakgrunn.`;
    ui.liveStatus.className = "live-status ok";
  } else {
    ui.liveStatus.textContent = liveError
      ? `Kunne ikke laste sanntidsdata (${String(liveError.message || liveError)}). Alle barnehager vises uten oppgitte plasser.`
      : "Kunne ikke laste sanntidsdata. Alle barnehager vises uten oppgitte plasser.";
    ui.liveStatus.className = "live-status fail";
  }

  ui.buildBtn.addEventListener("click", buildRoute);
  ui.shareBtn.addEventListener("click", shareRoute);

  // Saved-routes bar: load or delete via event delegation (CSP blocks inline handlers).
  ui.savedRoutesList.addEventListener("click", (event) => {
    const loadBtn = event.target.closest(".saved-route-load");
    if (loadBtn) { hideInfo(); restoreRoute(loadBtn.dataset.bydel); return; }
    const deleteBtn = event.target.closest(".saved-route-delete");
    if (deleteBtn) {
      deleteRoute(deleteBtn.dataset.bydel);
      if (ui.bydelSelect.value === deleteBtn.dataset.bydel) {
        ui.resultsHeading.style.display = "none";
        ui.results.innerHTML = "";
        ui.shareBtn.style.display = "none";
        ui.mapsExport.style.display = "none";
        ui.mapsExport.innerHTML = "";
      }
    }
  });

  // Field notes: autosave the note text via delegation so re-renders don't lose handlers.
  ui.results.addEventListener("input", (event) => {
    if (!event.target.classList || !event.target.classList.contains("note-input")) return;
    const card = event.target.closest("article[data-key]");
    if (!card) return;
    const key = card.dataset.key;
    const cur = notesCache[key] || {};
    notesCache[key] = { ...cur, note: event.target.value.slice(0, 2000), updatedAt: new Date().toISOString() };
    persistNotes(notesCache);
  });

  renderSavedRoutes();

  // A shared link takes precedence; otherwise bring back the route the user
  // was working with before closing the browser.
  if (!importRouteFromHash()) {
    const store = loadStore();
    if (store.lastBydel) restoreRoute(store.lastBydel);
  }
}

init();
