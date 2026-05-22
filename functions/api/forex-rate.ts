/**
 * GET /api/forex-rate
 *
 * Proxies the NRB (Nepal Rastra Bank) official forex API.
 * Returns the daily USD → NPR mid-rate (average of buy + sell).
 * Cached 24 h in the Cloudflare edge cache so NRB is hit at most once per day.
 *
 * NRB API: https://www.nrb.org.np/api/forex/v1/rates
 * Ref page: https://www.nrb.org.np/forex/
 * Fallback: 155 (approximate mid-rate as of 2026-05-20; buy 154.16 / sell 154.76)
 */

const NRB_API    = "https://www.nrb.org.np/api/forex/v1/rates";
const FALLBACK   = 155;
const CACHE_SECS = 60 * 60 * 24; // 24 h

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type":                 "application/json",
};

interface NRBPayload {
  date:  string;
  rates: Array<{
    currency: { iso3: string; name: string };
    buy:      string;
    sell:     string;
  }>;
}

interface NRBResponse {
  data: { payload: NRBPayload[] };
}

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestGet = async (context: { request: Request }): Promise<Response> => {
  // Check Cloudflare edge cache (keyed by today's date)
  const today    = new Date().toISOString().slice(0, 10);
  const cacheKey = new Request(`https://zzc-internal/forex-usd-npr/${today}`);
  const cache    = (caches as unknown as { default: Cache }).default;

  const hit = await cache.match(cacheKey);
  if (hit) {
    const body = await hit.json();
    return new Response(JSON.stringify({ ...body, cached: true }), { headers: CORS });
  }

  // Request last 7 days — NRB publishes nothing on weekends/holidays.
  // The most recent entry in the response is the latest published rate.
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

  try {
    const res = await fetch(
      `${NRB_API}?page=1&per_page=10&from=${sevenDaysAgo}&to=${today}&q=USD`,
      { headers: { Accept: "application/json" } },
    );

    if (!res.ok) throw new Error(`NRB HTTP ${res.status}`);

    const json = await res.json() as NRBResponse;
    // payload is sorted newest-first; find the first entry that has a USD rate
    const payloads = json?.data?.payload ?? [];
    let found: { rate: number; buy: number; sell: number; date: string } | null = null;

    for (const p of payloads) {
      const r = p?.rates?.find(r => r.currency.iso3 === "USD");
      if (r && parseFloat(r.buy) > 0) {
        const buy  = parseFloat(r.buy);
        const sell = parseFloat(r.sell);
        found = { rate: parseFloat(((buy + sell) / 2).toFixed(2)), buy, sell, date: p.date };
        break;
      }
    }

    if (!found) throw new Error("No USD rate found in last 7 NRB entries");

    const isToday  = found.date === today;
    const body     = JSON.stringify({
      rateNPR: found.rate,
      buy:     found.buy,
      sell:    found.sell,
      date:    found.date,
      source:  isToday ? "NRB" : "NRB-latest",
    });
    const response = new Response(body, {
      headers: { ...CORS, "Cache-Control": `public, max-age=${CACHE_SECS}` },
    });
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (err) {
    return new Response(
      JSON.stringify({ rateNPR: FALLBACK, date: today, source: "fallback", note: String(err) }),
      { headers: CORS },
    );
  }
};
