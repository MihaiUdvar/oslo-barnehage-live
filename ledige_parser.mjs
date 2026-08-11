// Parser for https://www.oslo.kommune.no/barnehage/ledige-barnehageplasser/
// Shared by the Netlify function (live) and scrape_ledige_plasser.mjs (snapshot).

const BARNEHAGE_LINK = /finn-barnehage-i-oslo/;

function decodeEntities(str) {
  return str
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

// Classify a free-text item into liten (under 3) / stor (over 3) spot counts.
// Handles variants seen on the page: "2 plasser over 3 år", "2plasser over 3 år",
// "6 ledige plasser or barn 3–6 år", "1 ledig plass til barn født i 2024",
// "1 ledig plass for barn født 2021–2023", "3 småbarnsplasser",
// "1 ledig plass fra august, og 1 ledig plass fra september".
export function classifySpots(text, refYear) {
  const t = text.toLowerCase();

  let count = 0;
  const numRe = /(\d+)\s*(?:ledige?\s+)?(?:småbarns)?plass(?:er)?/g;
  let m;
  while ((m = numRe.exec(t))) count += Number(m[1]);

  let category = null;
  if (/under 3|småbarn/.test(t)) {
    category = "liten";
  } else if (/over 3|3\s*[–-]\s*6\s*år/.test(t)) {
    category = "stor";
  } else {
    // Birth years: kids born refYear-2 or later are in småbarnsavdeling (under 3).
    const born = t.match(/født\s+(?:i\s+)?(\d{4})(?:\s*[–-]\s*(\d{4}))?/);
    if (born) {
      const maxYear = Number(born[2] || born[1]);
      category = maxYear >= refYear - 2 ? "liten" : "stor";
    }
  }

  return {
    liten: category === "liten" ? count : 0,
    stor: category === "stor" ? count : 0,
    unclassified: category === null ? count : 0,
  };
}

// Returns { "<bydel>": { updated: "23. juni 2026", entries: [{url, name, liten, stor, text}] }, ... }
export function parseLedigePlasser(html, refYear = new Date().getFullYear()) {
  const contentMatch = html.match(/<div class="ods-content">([\s\S]*?)<\/div>/);
  const content = contentMatch ? contentMatch[1] : html;

  const bydeler = {};
  const sections = content.split(/<h3[^>]*>/).slice(1);

  for (const section of sections) {
    const headingEnd = section.indexOf("</h3>");
    if (headingEnd === -1) continue;
    const heading = stripTags(section.slice(0, headingEnd));
    const body = section.slice(headingEnd + "</h3>".length);

    const hm = heading.match(/^Bydel\s+(.+?)\s*\(\s*oppdatert\s+(.+?)\s*\)/i);
    if (!hm) continue;
    const bydel = hm[1].trim();
    const updated = hm[2].trim();

    const entries = [];
    const itemRe = /<(li|p)[^>]*>([\s\S]*?)<\/\1>/gi;
    let item;
    while ((item = itemRe.exec(body))) {
      const inner = item[2];
      const link = inner.match(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!link || !BARNEHAGE_LINK.test(link[1])) continue;

      const url = link[1].replace(/\/+$/, "");
      const name = stripTags(link[2]).replace(/[:\s]+$/, "");
      const text = stripTags(inner);
      const { liten, stor, unclassified } = classifySpots(text, refYear);
      entries.push({ url, name, liten, stor, unclassified, text });
    }

    bydeler[bydel] = { updated, entries };
  }

  return bydeler;
}
