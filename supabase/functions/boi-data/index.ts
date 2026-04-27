import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SDMX = "https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const url = new URL(req.url);
    const series = url.searchParams.get("series") ?? "BR";
    const from   = url.searchParams.get("from")   ?? "2022-01-01";
    const id     = url.searchParams.get("id")     ?? "";

    const key = url.searchParams.get("key") ?? "";
    const boiUrl = key
      ? `${SDMX}/${series}/1.0/${key}/?startPeriod=${from}`
      : `${SDMX}/${series}/1.0/?startPeriod=${from}`;
    const r = await fetch(boiUrl, { headers: { Accept: "application/xml" } });
    if (!r.ok) throw new Error(`BOI API returned ${r.status}`);

    const xml = await r.text();
    // when key is in the URL path, SDMX already returns one series — no regex filter needed
    const data = key ? parseObs(xml) : parseObs(xml, id || undefined);

    return new Response(JSON.stringify({ ok: true, data }), {
      headers: {
        ...CORS,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
