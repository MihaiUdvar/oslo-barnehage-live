// Netlify function: resolves a shortened Google Maps share link (e.g. maps.app.goo.gl/...,
// the format the Google Maps mobile app produces) to the coordinates it points to.
// Browsers can't read a cross-origin redirect's target themselves, so this follows it server-side.
const ALLOWED_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"]);

function extractLatLon(url) {
  let m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (m) return { lat: Number(m[1]), lon: Number(m[2]) };
  m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return { lat: Number(m[1]), lon: Number(m[2]) };
  m = url.match(/maps\/search\/(-?\d+\.\d+),\+?\s*(-?\d+\.\d+)/);
  if (m) return { lat: Number(m[1]), lon: Number(m[2]) };
  m = url.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return { lat: Number(m[1]), lon: Number(m[2]) };
  return null;
}

export default async (req) => {
  const target = new URL(req.url).searchParams.get("url") || "";

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  const hostOk = ALLOWED_HOSTS.has(parsed.hostname) &&
    (parsed.hostname !== "goo.gl" || parsed.pathname.startsWith("/maps"));
  if (!hostOk) {
    return Response.json({ error: "Unsupported link host" }, { status: 400 });
  }

  try {
    const res = await fetch(parsed.toString(), {
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (oslo-barnehage-2026; +https://github.com/tfreyd/oslo_barnehage_2026)" },
    });
    const finalUrl = res.url || parsed.toString();
    const coords = extractLatLon(finalUrl);
    if (!coords) {
      return Response.json({ error: "Could not find coordinates in resolved link", resolvedUrl: finalUrl }, { status: 422 });
    }
    return Response.json({ ...coords, resolvedUrl: finalUrl });
  } catch (err) {
    return Response.json({ error: String((err && err.message) || err) }, { status: 502 });
  }
};
