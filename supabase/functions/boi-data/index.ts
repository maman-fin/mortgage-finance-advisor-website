import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SDMX = "https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS";
const CBS  = "https://api.cbs.gov.il/index";

function parseObs(xml: string, seriesId?: string): { period: string; value: number }[] {
  let src = xml;

  if (seriesId) {
    const re = new RegExp(`<Series[^>]*SERIES_CODE="${seriesId}"[^>]*>([\\s\\S]*?)</Series>`);
    const m = re.exec(xml);
    if (!m) return [];
    src = m[1];
  }

  const obs: { period: string; value: number }[] = [];
  const re = /<Obs\b[^>]*>/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const s = m[0];
    const t = /TIME_PERIOD="([^"]+)"/.exec(s);
    const v = /OBS_VALUE="([^"]+)"/.exec(s);
    if (t && v && !isNaN(parseFloat(v[1]))) {
      obs.push({ period: t[1], value: parseFloat(v[1]) });
    }
  }

  return obs.sort((a, b) => (a.period < b.period ? -1 : 1));
}

// ── CBS price index parser ──────────────────────────────────────────────────
// מחזיר מערך של { period: 'YYYY-MM', value: שינוי חודשי % }
function parseCBSPriceAll(raw: unknown): { period: string; value: number }[] | null {
  let items: unknown[] = [];

  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    for (const k of ["Data", "data", "items", "Items", "result", "Results"]) {
      if (Array.isArray(r[k])) { items = r[k] as unknown[]; break; }
    }
  }

  if (items.length === 0) return null;

  const obs: { period: string; value: number }[] = [];

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;

    // period field — try several names
    let p = "";
    for (const k of ["Period", "period", "Date", "date", "PERIOD", "PeriodDesc"]) {
      if (typeof it[k] === "string" || typeof it[k] === "number") {
        p = String(it[k]); break;
      }
    }
    if (!p) continue;

    // monthly % change field — try several names
    let v: number | null = null;
    for (const k of ["Change1M", "change1m", "PctChange1M", "pct_change_1m",
                     "ChangeM", "change_m", "Pct1M", "pct1m", "Diff1M"]) {
      if (it[k] !== undefined && it[k] !== null && !isNaN(parseFloat(String(it[k])))) {
        v = parseFloat(String(it[k])); break;
      }
    }
    if (v === null) continue;

    // normalise period → YYYY-MM
    let m = "";
    if (/^\d{4}-\d{2}/.test(p))      m = p.slice(0, 7);
    else if (/^\d{2}\/\d{4}$/.test(p)) m = p.slice(3, 7) + "-" + p.slice(0, 2);
    else if (/^\d{4}\/\d{2}$/.test(p)) m = p.slice(0, 4) + "-" + p.slice(5, 7);
    else if (/^\d{6}$/.test(p))        m = p.slice(0, 4) + "-" + p.slice(4, 6);
    if (!m) continue;

    obs.push({ period: m, value: v });
  }

  return obs.sort((a, b) => (a.period < b.period ? -1 : 1));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const url    = new URL(req.url);
    const series = url.searchParams.get("series") ?? "BR";

    // ── CBS מדד תשומות הבנייה ──────────────────────────────────────────
    if (series === "CBS") {
      const chapter = url.searchParams.get("chapter") ?? "c";
      const cbsUrl  = `${CBS}/data/price_all?chapter=${chapter}&format=json&lang=he&download=false`;
      const r = await fetch(cbsUrl, {
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(20000),
      });
      if (!r.ok) throw new Error(`CBS API returned ${r.status}`);
      const raw  = await r.json();
      const data = parseCBSPriceAll(raw);
      // אם הפרסור הצליח — החזר נרמל; אחרת החזר גולמי לדיבוג
      return new Response(
        JSON.stringify({ ok: true, data: data ?? raw, parsed: data !== null }),
        { headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } }
      );
    }

    // ── בנק ישראל SDMX ────────────────────────────────────────────────
    const from = url.searchParams.get("from") ?? "2022-01-01";
    const id   = url.searchParams.get("id")   ?? "";
    const key  = url.searchParams.get("key")  ?? "";

    const boiUrl = key
      ? `${SDMX}/${series}/1.0/${key}/?startPeriod=${from}`
      : `${SDMX}/${series}/1.0/?startPeriod=${from}`;
    const r = await fetch(boiUrl, { headers: { Accept: "application/xml" } });
    if (!r.ok) throw new Error(`BOI API returned ${r.status}`);

    const xml  = await r.text();
    const data = key ? parseObs(xml) : parseObs(xml, id || undefined);

    return new Response(JSON.stringify({ ok: true, data }), {
      headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
