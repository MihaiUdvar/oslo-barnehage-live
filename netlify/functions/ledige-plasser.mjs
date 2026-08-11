// Netlify function: fetches the live "ledige barnehageplasser" page and returns
// parsed per-bydel availability as JSON. Called by the app's "Ledige plasser nå" toggle.
import { parseLedigePlasser } from "../../ledige_parser.mjs";

const SOURCE = "https://www.oslo.kommune.no/barnehage/ledige-barnehageplasser/";

export default async () => {
  try {
    const res = await fetch(SOURCE, {
      headers: { "user-agent": "Mozilla/5.0 (oslo-barnehage-2026; +https://github.com/tfreyd/oslo_barnehage_2026)" },
    });
    if (!res.ok) {
      return Response.json({ error: `Upstream responded ${res.status}` }, { status: 502 });
    }
    const html = await res.text();
    const bydeler = parseLedigePlasser(html);
    return Response.json(
      { fetched_at: new Date().toISOString(), source: SOURCE, bydeler },
      { headers: { "cache-control": "public, max-age=300" } }
    );
  } catch (err) {
    return Response.json({ error: String((err && err.message) || err) }, { status: 502 });
  }
};
