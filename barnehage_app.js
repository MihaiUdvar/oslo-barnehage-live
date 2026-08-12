const bydelColors = {
  "Alna": "#1f77b4", "Bjerke": "#ff7f0e", "Frogner": "#2ca02c", "Gamle Oslo": "#d62728",
  "Grorud": "#9467bd", "Grünerløkka": "#8c564b", "Nordre Aker": "#e377c2", "Nordstrand": "#7f7f7f",
  "Østensjø": "#7c3aed", "Sagene": "#17becf", "Søndre Nordstrand": "#1b9e77", "St. Hanshaugen": "#d95f02",
  "Stovner": "#7570b3", "Ullern": "#e7298a", "Vestre Aker": "#66a61e"
};

let map = null;
let markerLayer = null;
const mapHost = document.getElementById("map");
const mapPane = document.getElementById("mapPane");
const mapResizer = document.getElementById("mapResizer");
if (window.L && mapHost) {
  map = L.map("map").setView([59.9139, 10.7522], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
} else if (mapHost) {
  mapHost.innerHTML = '<div class="empty" style="margin:12px;">Map unavailable in this environment. Results are still shown below.</div>';
}

const ui = {
  lang: document.getElementById("lang"),
  search: document.getElementById("search"),
  bydel: document.getElementById("bydel"),
  zipCode: document.getElementById("zipCode"),
  minSpots: document.getElementById("minSpots"),
  results: document.getElementById("results"),
  title: document.getElementById("title"),
  subtitle: document.getElementById("subtitle"),
  lblSearch: document.getElementById("lbl-search"),
  lblBydel: document.getElementById("lbl-bydel"),
  lblZip: document.getElementById("lbl-zip"),
  lblMode: document.getElementById("lbl-mode"),
  lblMin: document.getElementById("lbl-min"),
  routePlannerLink: document.getElementById("routePlannerLink"),
  resultsBanner: document.getElementById("resultsBanner"),
  modeButtons: [...document.querySelectorAll(".seg button")],
  liveToggle: document.getElementById("liveToggle"),
  kMatch: document.getElementById("k-match"),
  kLiten: document.getElementById("k-liten"),
  kStor: document.getElementById("k-stor"),
  vMatch: document.getElementById("v-match"),
  vLiten: document.getElementById("v-liten"),
  vStor: document.getElementById("v-stor")
};

const I18N = {
  no: {
    title: "Finn barnehageplass i Oslo (2026)",
    subtitle: "Filtrer på bydel og avdelingstype",
    search: "Søk barnehage",
    searchPh: "Skriv navn...",
    bydel: "Bydel",
    zip: "Postnummer",
    allZip: "Alle postnumre",
    allBydel: "Alle bydeler",
    mode: "Avdeling",
    both: "Begge",
    liten: "Liten",
    stor: "Stor",
    min: "Minimum ledige plasser",
    match: "Treff",
    sumLiten: "Sum liten",
    sumStor: "Sum stor",
    open: "Åpne side",
    noResults: "Ingen resultater med nåværende filter.",
    address: "Adresse",
    bydelLbl: "Bydel",
    live: "Ledige plasser nå",
    phone: "Telefon",
    lastUpdated: "Sist oppdatert",
    liveLoading: "Henter...",
    liveError: "Kunne ikke hente data",
    routePlanner: "Rute for besøk",
    onlyWithSpots: "Kun barnehager med ledige plasser vises nedenfor.",
  },
  en: {
    title: "Oslo Kindergarten Finder (2026)",
    subtitle: "Filter by district and section type",
    search: "Search kindergarten",
    searchPh: "Type name...",
    bydel: "District",
    zip: "Zip code",
    allZip: "All zip codes",
    allBydel: "All districts",
    mode: "Section",
    both: "Both",
    liten: "Under 3",
    stor: "Over 3",
    min: "Minimum available spots",
    match: "Matches",
    sumLiten: "Total under 3",
    sumStor: "Total over 3",
    open: "Open page",
    noResults: "No results for the current filters.",
    address: "Address",
    bydelLbl: "District",
    live: "Available spots now",
    phone: "Phone",
    lastUpdated: "Last updated",
    liveLoading: "Loading...",
    liveError: "Could not load data",
    routePlanner: "Visit route",
    onlyWithSpots: "Only kindergartens with available spots are shown below.",
  },
  fr: {
    title: "Recherche de crèches à Oslo (2026)",
    subtitle: "Filtrer par district et section",
    search: "Rechercher une crèche",
    searchPh: "Saisir un nom...",
    bydel: "District",
    zip: "Code postal",
    allZip: "Tous les codes postaux",
    allBydel: "Tous les districts",
    mode: "Section",
    both: "Les deux",
    liten: "Moins de 3 ans",
    stor: "Plus de 3 ans",
    min: "Places disponibles minimum",
    match: "Résultats",
    sumLiten: "Total moins de 3 ans",
    sumStor: "Total plus de 3 ans",
    open: "Ouvrir la page",
    noResults: "Aucun résultat avec ces filtres.",
    address: "Adresse",
    bydelLbl: "District",
    live: "Places disponibles maintenant",
    phone: "Téléphone",
    lastUpdated: "Dernière mise à jour",
    liveLoading: "Chargement...",
    liveError: "Impossible de charger les données",
    routePlanner: "Itinéraire de visite",
    onlyWithSpots: "Seules les crèches avec des places disponibles sont affichées ci-dessous.",
  },
  es: {
    title: "Buscador de guarderías en Oslo (2026)",
    subtitle: "Filtra por distrito y tipo de sección",
    search: "Buscar guardería",
    searchPh: "Escribe un nombre...",
    bydel: "Distrito",
    zip: "Código postal",
    allZip: "Todos los códigos postales",
    allBydel: "Todos los distritos",
    mode: "Sección",
    both: "Ambas",
    liten: "Menores de 3",
    stor: "Mayores de 3",
    min: "Plazas mínimas disponibles",
    match: "Resultados",
    sumLiten: "Total menores de 3",
    sumStor: "Total mayores de 3",
    open: "Abrir página",
    noResults: "No hay resultados con estos filtros.",
    address: "Dirección",
    bydelLbl: "Distrito",
    live: "Plazas disponibles ahora",
    phone: "Teléfono",
    lastUpdated: "Última actualización",
    liveLoading: "Cargando...",
    liveError: "No se pudieron cargar los datos",
    routePlanner: "Ruta de visitas",
    onlyWithSpots: "Solo se muestran las guarderías con plazas disponibles.",
  },
  ar: {
    title: "البحث عن حضانة في أوسلو (2026)",
    subtitle: "تصفية حسب المنطقة ونوع القسم",
    search: "البحث عن حضانة",
    searchPh: "اكتب الاسم...",
    bydel: "المنطقة",
    zip: "الرمز البريدي",
    allZip: "جميع الأرقام البريدية",
    allBydel: "جميع المناطق",
    mode: "القسم",
    both: "الكل",
    liten: "أقل من 3",
    stor: "أكثر من 3",
    min: "الحد الأدنى من الأماكن المتاحة",
    match: "نتائج",
    sumLiten: "المجموع أقل من 3",
    sumStor: "المجموع أكثر من 3",
    open: "فتح الصفحة",
    noResults: "لا توجد نتائج مع هذه الفلاتر.",
    address: "العنوان",
    bydelLbl: "المنطقة",
    live: "الأماكن المتاحة الآن",
    phone: "الهاتف",
    lastUpdated: "آخر تحديث",
    liveLoading: "جارٍ التحميل...",
    liveError: "تعذر تحميل البيانات",
    routePlanner: "مسار الزيارة",
    onlyWithSpots: "تُعرض أدناه فقط الحضانات التي تتوفر فيها أماكن.",
  },
  ku: {
    title: "Pêşkêşkirina zaroktan a Osloyê (2026)",
    subtitle: "Li gorî taxazê û awayê beşê biguhere",
    search: "Pêşkêşkirinê bigere",
    searchPh: "Navê binivîse...",
    bydel: "Tax",
    zip: "Koda postayê",
    allZip: "Hemû kodên postayê",
    allBydel: "Hemû tax",
    mode: "Beş",
    both: "Herdu",
    liten: "Ji 3 kêmtir",
    stor: "Ji 3 zêdetir",
    min: "Rêjmana herî kêm a cihên vala",
    match: "Encam",
    sumLiten: "Kurşê ji 3",
    sumStor: "Kurşê zêde ji 3",
    open: "Rûpel veke",
    noResults: "Encamên nîne.",
    address: "Navnîşan",
    bydelLbl: "Tax",
    live: "Cihên vala niha",
    phone: "Telefon",
    lastUpdated: "Dawî nûkirin",
    liveLoading: "Tê barkirin...",
    liveError: "Dane nehatin barkirin",
    routePlanner: "Rêya serdanê",
    onlyWithSpots: "Tenê zarokxaneyên bi cihên vala li jêr têne nîşandan.",
  },
  so: {
    title: "Raadinta dhismooyinka carruurta Oslo (2026)",
    subtitle: "Kala sooca degmada nooca qaybta",
    search: "Raadhi dhismo",
    searchPh: "Qor magaca...",
    bydel: "Degmo",
    zip: "Koodka boosta",
    allZip: "Dhamma koodka boosta",
    allBydel: "Dhamma degmooyinka",
    mode: "Qayb",
    both: "Labadaba",
    liten: "Ka yar 3",
    stor: "Ka weyn 3",
    min: "ug yaraynta joojiyeyaasha",
    match: "Natiijo",
    sumLiten: "Wadarta ka yar 3",
    sumStor: "Wadarta ka weyn 3",
    open: "Fur bogga",
    noResults: "Natiijo maahan ee shaandheynta hadda.",
    address: "Ciwaanka",
    bydelLbl: "Degmo",
    live: "Boosaska bannaan hadda",
    phone: "Taleefan",
    lastUpdated: "Markii ugu dambeysay la cusboonaysiiyay",
    liveLoading: "Waa la soo dejinayaa...",
    liveError: "Xogta lama soo dejin karin",
    routePlanner: "Jidiga booqashada",
    onlyWithSpots: "Kaliya xannaanooyinka leh boosas bannaan ayaa hoos lagu muujiyaa.",
  },
  tr: {
    title: "Oslo Anaokulu Bulucu (2026)",
    subtitle: "İlçeye ve bölüm türüne göre filtrele",
    search: "Anaokulu ara",
    searchPh: "İsim yaz...",
    bydel: "İlçe",
    zip: "Posta kodu",
    allZip: "Tüm posta kodları",
    allBydel: "Tüm ilçeler",
    mode: "Bölüm",
    both: "Her ikisi",
    liten: "3 yaş altı",
    stor: "3 yaş üstü",
    min: "Minimum boş yer",
    match: "Sonuçlar",
    sumLiten: "Toplam 3 yaş altı",
    sumStor: "Toplam 3 yaş üstü",
    open: "Sayfayı aç",
    noResults: "Mevcut filtreler için sonuç yok.",
    address: "Adres",
    bydelLbl: "İlçe",
    live: "Şu an boş yerler",
    phone: "Telefon",
    lastUpdated: "Son güncelleme",
    liveLoading: "Yükleniyor...",
    liveError: "Veriler yüklenemedi",
    routePlanner: "Ziyaret rotası",
    onlyWithSpots: "Aşağıda yalnızca boş yeri olan anaokulları gösterilir.",
  },
  pl: {
    title: "Szukaj przedszkola w Oslo (2026)",
    subtitle: "Filtruj według dzielnicy i typu oddziału",
    search: "Szukaj przedszkola",
    searchPh: "Wpisz nazwę...",
    bydel: "Dzielnica",
    zip: "Kod pocztowy",
    allZip: "Wszystkie kody pocztowe",
    allBydel: "Wszystkie dzielnice",
    mode: "Oddział",
    both: "Oba",
    liten: "Poniżej 3 lat",
    stor: "Powyżej 3 lat",
    min: "Minimum wolnych miejsc",
    match: "Wyniki",
    sumLiten: "Suma poniżej 3 lat",
    sumStor: "Suma powyżej 3 lat",
    open: "Otwórz stronę",
    noResults: "Brak wyników dla bieżących filtrów.",
    address: "Adres",
    bydelLbl: "Dzielnica",
    live: "Wolne miejsca teraz",
    phone: "Telefon",
    lastUpdated: "Ostatnia aktualizacja",
    liveLoading: "Ładowanie...",
    liveError: "Nie udało się załadować danych",
    routePlanner: "Trasa wizyt",
    onlyWithSpots: "Poniżej wyświetlane są tylko przedszkola z wolnymi miejscami.",
  },
  vi: {
    title: "Tìm trường mẫu giáo ở Oslo (2026)",
    subtitle: "Lọc theo quận và loại nhóm",
    search: "Tìm trường mẫu giáo",
    searchPh: "Nhập tên...",
    bydel: "Quận",
    zip: "Mã bưu chính",
    allZip: "Tất cả mã bưu chính",
    allBydel: "Tất cả các quận",
    mode: "Nhóm",
    both: "Cả hai",
    liten: "Dưới 3 tuổi",
    stor: "Trên 3 tuổi",
    min: "Số chỗ tối thiểu",
    match: "Kết quả",
    sumLiten: "Tổng dưới 3",
    sumStor: "Tổng trên 3",
    open: "Mở trang",
    noResults: "Không có kết quả cho bộ lọc hiện tại.",
    address: "Địa chỉ",
    bydelLbl: "Quận",
    live: "Chỗ trống hiện tại",
    phone: "Điện thoại",
    lastUpdated: "Cập nhật lần cuối",
    liveLoading: "Đang tải...",
    liveError: "Không thể tải dữ liệu",
    routePlanner: "Lộ trình thăm",
    onlyWithSpots: "Chỉ hiển thị các trường mẫu giáo còn chỗ trống bên dưới.",
  },
  hi: {
    title: "ओस्लो में नर्सरी खोजें (2026)",
    subtitle: "जिले और खंड प्रकार के अनुसार फ़िल्टर करें",
    search: "नर्सरी खोजें",
    searchPh: "नाम लिखें...",
    bydel: "जिला",
    zip: "पिन कोड",
    allZip: "सभी पिन कोड",
    allBydel: "सभी जिले",
    mode: "खंड",
    both: "दोनों",
    liten: "3 से कम",
    stor: "3 से अधिक",
    min: "न्यूनतम उपलब्ध स्थान",
    match: "परिणाम",
    sumLiten: "कुल 3 से कम",
    sumStor: "कुल 3 से अधिक",
    open: "पृष्ठ खोलें",
    noResults: "वर्तमान फ़िल्टर के लिए कोई परिणाम नहीं।",
    address: "पता",
    bydelLbl: "जिला",
    live: "अभी उपलब्ध स्थान",
    phone: "फ़ोन",
    lastUpdated: "अंतिम अपडेट",
    liveLoading: "लोड हो रहा है...",
    liveError: "डेटा लोड नहीं हो सका",
    routePlanner: "यात्रा मार्ग",
    onlyWithSpots: "नीचे केवल उपलब्ध स्थान वाली नर्सरी दिखाई जाती हैं।",
  },
  fa: {
    title: "یافتن مهدکودک در اسلو (2026)",
    subtitle: "فیلتر بر اساس منطقه و نوع بخش",
    search: "جستجوی مهدکودک",
    searchPh: "نام را بنویسید...",
    bydel: "منطقه",
    zip: "کد پستی",
    allZip: "همه کدهای پستی",
    allBydel: "همه مناطق",
    mode: "بخش",
    both: "هر دو",
    liten: "زیر 3 سال",
    stor: "بالای 3 سال",
    min: "حداقل فضای موجود",
    match: "نتایج",
    sumLiten: "مجموع زیر 3",
    sumStor: "مجموع بالای 3",
    open: "باز کردن صفحه",
    noResults: "هیچ نتیجه‌ای برای فیلترهای فعلی وجود ندارد.",
    address: "آدرس",
    bydelLbl: "منطقه",
    live: "جاهای خالی اکنون",
    phone: "تلفن",
    lastUpdated: "آخرین به‌روزرسانی",
    liveLoading: "در حال بارگذاری...",
    liveError: "بارگذاری داده‌ها ممکن نشد",
    routePlanner: "مسیر بازدید",
    onlyWithSpots: "در زیر فقط مهدکودک‌هایی با جای خالی نمایش داده می‌شوند.",
  }
};

let allRows = [];
let mode = "both";
let currentMapBounds = null;
let liveMode = false;
let liveData = null;
let liveByUrl = new Map();
let liveDates = new Map();

function t(key) { return I18N[ui.lang.value][key] || key; }

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

function normalizeUrl(url) {
  return typeof url === "string" ? url.replace(/\/+$/, "") : "";
}

// Spots for a row in the current view: expected capacity (PDF data) by default,
// currently announced availability when live mode is on.
function spotsFor(row) {
  if (liveMode && liveData) {
    const entry = liveByUrl.get(normalizeUrl(row.barnehage_url));
    return { liten: entry ? entry.liten : 0, stor: entry ? entry.stor : 0 };
  }
  return {
    liten: Number(row.spot_litenavdeling || 0),
    stor: Number(row.spot_storavdeling || 0)
  };
}

function selectedSpots(row) {
  const { liten, stor } = spotsFor(row);
  if (mode === "liten") return liten;
  if (mode === "stor") return stor;
  return Math.max(liten, stor);
}

// Fetch live availability: Netlify function first, embedded snapshot as fallback.
async function ensureLiveData() {
  if (liveData) return true;
  let data = null;
  try {
    const res = await fetch("/.netlify/functions/ledige-plasser");
    if (res.ok) data = await res.json();
  } catch {
    // Ignore; fall back to snapshot (e.g. local server without Netlify functions)
  }
  if (!data || !data.bydeler) data = window.BARNEHAGE_LIVE;
  if (!data || !data.bydeler) return false;

  liveByUrl = new Map();
  liveDates = new Map();
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
  liveData = data;
  return true;
}

function setLanguage() {
  ui.title.textContent = t("title");
  ui.subtitle.textContent = t("subtitle");
  ui.lblSearch.textContent = t("search");
  ui.search.placeholder = t("searchPh");
  ui.lblBydel.textContent = t("bydel");
  ui.lblZip.textContent = t("zip");
  ui.lblMode.textContent = t("mode");
  ui.lblMin.textContent = t("min");
  ui.kMatch.textContent = t("match");
  ui.kLiten.textContent = t("sumLiten");
  ui.kStor.textContent = t("sumStor");
  ui.liveToggle.textContent = t("live");
  ui.routePlannerLink.textContent = t("routePlanner");
  ui.routePlannerLink.setAttribute("aria-label", t("routePlanner"));
  ui.resultsBanner.textContent = t("onlyWithSpots");

  ui.modeButtons[0].textContent = t("both");
  ui.modeButtons[1].textContent = t("liten");
  ui.modeButtons[2].textContent = t("stor");

  const prevBydel = ui.bydel.value;
  ui.bydel.options[0].textContent = t("allBydel");
  ui.bydel.value = prevBydel;

  const prevZip = ui.zipCode.value;
  ui.zipCode.options[0].textContent = t("allZip");
  ui.zipCode.value = prevZip;
}

function loadBydeler(rows) {
  const bydeler = [...new Set(rows.map(r => r.bydel).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  for (const b of bydeler) {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    ui.bydel.appendChild(opt);
  }
}

function loadZipCodes(rows) {
  const zipCodes = [...new Set(rows.map(r => r.zip_code).filter(z => z))].sort();
  ui.zipCode.innerHTML = '<option value="ALL"></option>';
  zipCodes.forEach(zip => {
    const opt = document.createElement("option");
    opt.value = zip;
    opt.textContent = zip;
    ui.zipCode.appendChild(opt);
  });
}

function baseRows() {
  const q = ui.search.value.trim().toLowerCase();
  const b = ui.bydel.value;
  const z = ui.zipCode.value;

  return allRows.filter(r => {
    if (b !== "ALL" && r.bydel !== b) return false;
    if (z !== "ALL" && r.zip_code !== z) return false;
    if (q && !(r.barnehage || "").toLowerCase().includes(q)) return false;
    return true;
  });
}

function filterRows() {
  const min = Math.max(0, Number(ui.minSpots.value || 0));
  const hasViewport = !!(currentMapBounds && window.L);

  return baseRows().filter(r => {
    // Hide rows with no spots in the selected section (max of both when "both").
    const spots = selectedSpots(r);
    if (spots === 0) return false;
    if (spots < min) return false;
    if (!hasViewport) return true;
    const lat = Number(r.latitude);
    const lon = Number(r.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
    return currentMapBounds.contains([lat, lon]);
  });
}

function renderStats(rows) {
  const sumL = rows.reduce((s, r) => s + spotsFor(r).liten, 0);
  const sumS = rows.reduce((s, r) => s + spotsFor(r).stor, 0);
  ui.vMatch.textContent = String(rows.length);
  ui.vLiten.textContent = String(sumL);
  ui.vStor.textContent = String(sumS);
}

function escapeHtml(value) {
  const str = value == null ? "" : String(value);
  return str.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function isSafeUrl(url) {
  // Verify url is a string type before validation
  if (!url || typeof url !== 'string') return false;
  return /^https?:\/\//i.test(url);
}

function buildAddressHtml(r) {
  const address = r.address || "";
  if (!address) return "";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return `<a class="addr-link" href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener">${escapeHtml(address)}</a>`;
}

// Norwegian numbers are 8 digits: mobiles (4x/9x) read as xxx xx xxx, landlines as xx xx xx xx.
function formatPhone(digits) {
  if (/^[49]/.test(digits)) return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ");
}

function buildPhoneHtml(r) {
  const digits = String(r.phone || "").replace(/\D/g, "");
  if (!/^\d{8}$/.test(digits)) return "";
  return `<a class="addr-link" href="tel:+47${digits}">${escapeHtml(formatPhone(digits))}</a>`;
}

// In live mode, the per-bydel "oppdatert" date from the source page.
function liveUpdatedText(r) {
  if (!liveMode || !liveData) return "";
  const date = liveDates.get(r.bydel);
  return date ? `${t("lastUpdated")}: ${date}` : "";
}

function buildPopupHtml(r) {
  const s = spotsFor(r);
  const updated = liveUpdatedText(r);
  const parts = [
    `<b>${escapeHtml(r.barnehage)}</b>`,
    `${t("bydelLbl")}: ${escapeHtml(r.bydel)}`,
    `${t("liten")}: ${escapeHtml(String(s.liten))}`,
    `${t("stor")}: ${escapeHtml(String(s.stor))}`
  ];
  if (updated) parts.push(escapeHtml(updated));
  const address = buildAddressHtml(r);
  if (address) parts.push(address);
  const phone = buildPhoneHtml(r);
  if (phone) parts.push(`☎ ${phone}`);
  return parts.join("<br>");
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

function renderMap(rows) {
  if (!markerLayer || !window.L) return;
  markerLayer.clearLayers();

  rows.forEach(r => {
    const lat = Number(r.latitude), lon = Number(r.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const radius = 5;
    const color = bydelColors[r.bydel] || "#334155";

    const popup = buildPopupHtml(r);

    L.circleMarker([lat, lon], {
      radius, color, fillColor: color, fillOpacity: 0.8, weight: 1
    }).bindPopup(popup).addTo(markerLayer);
  });

  // Keep Oslo centered by default; no automatic fitBounds.
}

function renderResults(rows) {
  if (!rows.length) {
    ui.results.innerHTML = `<div class="empty">${t("noResults")}</div>`;
    return;
  }

  ui.results.innerHTML = rows.slice(0, 700).map(r => {
    const link = buildLinkHtml(r);
    const s = spotsFor(r);
    const updated = liveUpdatedText(r);
    const updatedHtml = updated ? `<div class="meta live-updated">${escapeHtml(updated)}</div>` : "";
    const addressHtml = buildAddressHtml(r) || "-";
    const phoneHtml = buildPhoneHtml(r);
    const phoneLine = phoneHtml ? `<div class="meta">${t("phone")}: ${phoneHtml}</div>` : "";
    return `
      <article class="card">
        <h3>${escapeHtml(r.barnehage)}</h3>
        <div class="chips">
          <span class="chip">${escapeHtml(r.bydel)}</span>
          <span class="chip">${t("liten")}: ${escapeHtml(String(s.liten))}</span>
          <span class="chip">${t("stor")}: ${escapeHtml(String(s.stor))}</span>
        </div>
        ${updatedHtml}
        <div class="meta">${t("address")}: ${addressHtml}</div>
        ${phoneLine}
        <div>${link}</div>
      </article>
    `;
  }).join("");
}

// --- Filter state in the URL --------------------------------------------------
// Filters live in the query string (?bydel=Alna&mode=liten&q=...&zip=...&min=...&lang=...)
// so a filtered view can be bookmarked or shared. Defaults are omitted, and
// replaceState keeps typing in the search box from flooding browser history.
function applyFiltersFromUrl() {
  const p = new URLSearchParams(location.search);
  const lang = p.get("lang");
  if (lang && I18N[lang]) ui.lang.value = lang;
  const q = p.get("q");
  if (q) ui.search.value = q;
  const bydel = p.get("bydel");
  if (bydel && [...ui.bydel.options].some(o => o.value === bydel)) ui.bydel.value = bydel;
  const zip = p.get("zip");
  if (zip && [...ui.zipCode.options].some(o => o.value === zip)) ui.zipCode.value = zip;
  const m = p.get("mode");
  if (m === "liten" || m === "stor") {
    mode = m;
    ui.modeButtons.forEach(b => b.classList.toggle("active", b.dataset.mode === m));
  }
  const min = Number(p.get("min"));
  if (Number.isFinite(min) && min > 0) ui.minSpots.value = String(min);
}

function syncUrl() {
  const p = new URLSearchParams();
  const q = ui.search.value.trim();
  if (q) p.set("q", q);
  if (ui.bydel.value !== "ALL") p.set("bydel", ui.bydel.value);
  if (ui.zipCode.value !== "ALL") p.set("zip", ui.zipCode.value);
  if (mode !== "both") p.set("mode", mode);
  if (Number(ui.minSpots.value) > 0) p.set("min", String(Number(ui.minSpots.value)));
  if (ui.lang.value !== "no") p.set("lang", ui.lang.value);
  const qs = p.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

function refresh() {
  const rows = filterRows();
  renderStats(rows);
  renderMap(rows);
  renderResults(rows);
  syncUrl();
}

function bind() {
  ui.search.addEventListener("input", refresh);
  ui.bydel.addEventListener("input", refresh);
  ui.zipCode.addEventListener("input", refresh);
  ui.minSpots.addEventListener("input", refresh);
  ui.lang.addEventListener("change", () => { setLanguage(); refresh(); });

  ui.modeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      mode = btn.dataset.mode;
      ui.modeButtons.forEach(b => b.classList.toggle("active", b === btn));
      refresh();
    });
  });

  ui.liveToggle.addEventListener("click", async () => {
    if (!liveMode) {
      ui.liveToggle.disabled = true;
      ui.liveToggle.innerHTML = `<span class="spinner"></span>${escapeHtml(t("liveLoading"))}`;
      ui.results.innerHTML = `<div class="empty loading-state"><span class="spinner"></span>${escapeHtml(t("liveLoading"))}</div>`;
      const ok = await ensureLiveData();
      ui.liveToggle.disabled = false;
      if (!ok) {
        ui.liveToggle.textContent = t("liveError");
        setTimeout(() => { ui.liveToggle.textContent = t("live"); }, 2500);
        refresh();
        return;
      }
      liveMode = true;
    } else {
      liveMode = false;
    }
    ui.liveToggle.textContent = t("live");
    ui.liveToggle.classList.toggle("active", liveMode);
    ui.liveToggle.setAttribute("aria-pressed", String(liveMode));
    refresh();
  });

  if (mapPane && mapResizer) {
    let startY = 0;
    let startHeight = 0;
    let active = false;

    const onMove = (event) => {
      if (!active) return;
      const next = startHeight + (event.clientY - startY);
      const min = 220;
      const max = Math.max(min + 40, Math.floor(window.innerHeight * 0.78));
      const height = Math.max(min, Math.min(max, next));
      mapPane.style.height = `${height}px`;
      if (map && window.L) {
        map.invalidateSize();
        currentMapBounds = map.getBounds();
        refresh();
      }
    };

    const stop = () => {
      active = false;
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
    };

    mapResizer.addEventListener("pointerdown", (event) => {
      active = true;
      startY = event.clientY;
      startHeight = mapPane.getBoundingClientRect().height;
      document.body.style.cursor = "ns-resize";
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", stop);
      event.preventDefault();
    });
  }
}

async function loadRows() {
  if (Array.isArray(window.BARNEHAGE_ROWS) && window.BARNEHAGE_ROWS.length) {
    return window.BARNEHAGE_ROWS;
  }
  try {
    const res = await fetch("./barnehage_spots_2026.csv");
    if (res.ok) {
      return parseCSV(await res.text());
    }
  } catch {
    // Ignore fetch errors (e.g. file:// without server)
  }
  return [];
}

function getBarnehagefaktaUrl(row) {
  if (isSafeUrl(row.barnehagefakta_url)) {
    return row.barnehagefakta_url;
  }
  return null;
}

async function init() {
  setLanguage();
  bind();
  if (map && window.L) {
    map.on("moveend zoomend", () => {
      currentMapBounds = map.getBounds();
      refresh();
    });
    window.addEventListener("resize", () => map.invalidateSize());
  }
  allRows = await loadRows();
  if (!Array.isArray(allRows) || !allRows.length) {
    throw new Error("No data source available (embedded/json/csv).");
  }

  // Extract zip codes from addresses
  allRows = allRows.map(row => {
    if (row.address && typeof row.address === 'string') {
      const match = row.address.match(/\d{4}/);
      return { ...row, zip_code: match ? match[0] : '' };
    }
    return { ...row, zip_code: '' };
  });

  loadBydeler(allRows);
  loadZipCodes(allRows);
  applyFiltersFromUrl();
  setLanguage();
  refresh();
}

init().catch((err) => {
  ui.results.innerHTML = `<div class="empty">Data loading error: ${String(err.message || err)}</div>`;
});
