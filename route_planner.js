const ui = {
  startPoint: document.getElementById("startPoint"),
  bydelSelect: document.getElementById("bydelSelect"),
  buildBtn: document.getElementById("buildBtn"),
  clearBtn: document.getElementById("clearBtn"),
  routeError: document.getElementById("routeError"),
  routeWarning: document.getElementById("routeWarning"),
  liveStatus: document.getElementById("liveStatus"),
  savedRoutes: document.getElementById("savedRoutes"),
  savedRoutesList: document.getElementById("savedRoutesList"),
  resultsHeading: document.getElementById("resultsHeading"),
  results: document.getElementById("results")
};

let allRows = [];
let rowByKey = new Map();
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

// Same card markup as the main app's result list, plus a route order badge and distance line.
// Cards with no currently-announced live spots get a light red background instead of
// falling back to expected (PDF) capacity numbers.
function buildCardHtml(row, orderIndex, distanceKm, isWalking) {
  const link = buildLinkHtml(row);
  const s = liveSpotsFor(row);
  const addressHtml = buildAddressHtml(row) || "-";
  const distanceLabel = isWalking
    ? `${distanceKm.toFixed(1)} km gangavstand (via vei)`
    : `${distanceKm.toFixed(1)} km luftlinje fra startpunkt`;
  const updated = liveUpdatedText(row);
  const updatedHtml = updated ? `<div class="meta live-updated">${escapeHtml(updated)}</div>` : "";
  const spotsChips = s
    ? `<span class="chip">Liten: ${escapeHtml(String(s.liten))}</span><span class="chip">Stor: ${escapeHtml(String(s.stor))}</span>`
    : `<span class="chip chip-no-live">Ingen ledige plasser oppgitt</span>`;
  return `
    <article class="card${s ? "" : " card-no-live"}">
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
// Good enough as an on-road approximation; haversineKm() below is the fallback
// if the demo server is unreachable or rate-limits us.
const OSRM_TABLE_URL = "https://router.project-osrm.org/table/v1/foot/";

async function fetchRoadDistancesKm(point, destinations) {
  if (!destinations.length) return [];
  const coords = [point, ...destinations].map(p => `${p.lon},${p.lat}`).join(";");
  const url = `${OSRM_TABLE_URL}${coords}?sources=0&annotations=distance`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !Array.isArray(data.distances) || !data.distances[0]) return null;
    const metersToDestinations = data.distances[0].slice(1);
    if (metersToDestinations.length !== destinations.length) return null;
    if (metersToDestinations.some(m => typeof m !== "number")) return null;
    return metersToDestinations.map(m => m / 1000);
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
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

function loadBydeler(rows) {
  const bydeler = [...new Set(rows.map(r => r.bydel).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  for (const b of bydeler) {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    ui.bydelSelect.appendChild(opt);
  }
}

function renderResults(items, bydel, isWalking) {
  ui.resultsHeading.style.display = "block";
  const sortLabel = isWalking ? "gangavstand" : "luftlinjeavstand";
  ui.resultsHeading.textContent = `${items.length} barnehager i ${bydel}, sortert etter ${sortLabel}`;

  if (!items.length) {
    ui.results.innerHTML = `<div class="empty">Fant ingen barnehager med kjent posisjon i denne bydelen.</div>`;
    return;
  }
  ui.results.innerHTML = items.map((item, idx) => buildCardHtml(item.row, idx, item.dist, isWalking)).join("");
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

function saveRoute(bydel, startText, isWalking, items) {
  const store = loadStore();
  store.routes[bydel] = {
    startText,
    isWalking,
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
  renderResults(items, bydel, !!saved.isWalking);
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

  ui.buildBtn.textContent = "Beregner avstander...";
  const roadDistancesKm = await fetchRoadDistancesKm(point, candidates);
  ui.buildBtn.disabled = false;
  ui.buildBtn.textContent = originalLabel;

  let items;
  let isWalking;
  if (roadDistancesKm) {
    items = candidates
      .map((item, i) => ({ ...item, dist: roadDistancesKm[i] }))
      .sort((a, b) => a.dist - b.dist);
    isWalking = true;
  } else {
    items = candidates
      .map(item => ({ ...item, dist: haversineKm(point.lat, point.lon, item.lat, item.lon) }))
      .sort((a, b) => a.dist - b.dist);
    isWalking = false;
    if (candidates.length) {
      showWarning("Kunne ikke hente gangavstand via kart akkurat nå. Viser luftlinjeavstand i stedet.");
    }
  }

  renderResults(items, bydel, isWalking);
  saveRoute(bydel, ui.startPoint.value.trim(), isWalking, items);
}

function clearRoute() {
  hideError();
  hideWarning();
  const bydel = ui.bydelSelect.value;
  if (bydel) deleteRoute(bydel);
  ui.resultsHeading.style.display = "none";
  ui.results.innerHTML = "";
}

async function init() {
  allRows = await loadRows();
  if (!Array.isArray(allRows) || !allRows.length) {
    showError("Fant ingen data å bygge rute fra.");
    return;
  }
  loadBydeler(allRows);

  rowByKey = new Map();
  for (const row of allRows) {
    rowByKey.set(routeKey(row), row);
  }

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
  ui.clearBtn.addEventListener("click", clearRoute);

  // Saved-routes bar: load or delete via event delegation (CSP blocks inline handlers).
  ui.savedRoutesList.addEventListener("click", (event) => {
    const loadBtn = event.target.closest(".saved-route-load");
    if (loadBtn) { restoreRoute(loadBtn.dataset.bydel); return; }
    const deleteBtn = event.target.closest(".saved-route-delete");
    if (deleteBtn) {
      deleteRoute(deleteBtn.dataset.bydel);
      if (ui.bydelSelect.value === deleteBtn.dataset.bydel) {
        ui.resultsHeading.style.display = "none";
        ui.results.innerHTML = "";
      }
    }
  });

  renderSavedRoutes();

  // Bring back the route the user was working with before closing the browser.
  const store = loadStore();
  if (store.lastBydel) restoreRoute(store.lastBydel);
}

init();
