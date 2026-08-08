export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API endpoint to record real human visits (sent via client JS beacon)
    if (url.pathname === "/api/hit" && request.method === "POST") {
      try {
        const cf = request.cf || {};
        const userAgent = request.headers.get("user-agent") || "";
        const clientIp = request.headers.get("cf-connecting-ip") || "unknown";

        // 1. Strict Bot & Script Filtering
        const isBotAgent = /bot|crawler|spider|google|bing|yandex|baidu|slurp|facebookexternalhit|twitterbot|python|curl|wget|headless|puppeteer|selenium|phantom|postman|httpx|gobuster|nmap|zgrab/i.test(userAgent);
        const isVerifiedBot = cf.botManagement?.verifiedBot === true;
        const isLowBotScore = typeof cf.botManagement?.score === "number" && cf.botManagement.score < 30;

        let payload = {};
        try { payload = await request.json(); } catch(e) {}

        const isWebdriver = payload.webdriver === true;

        if (isBotAgent || isVerifiedBot || isLowBotScore || isWebdriver) {
          return new Response(JSON.stringify({ ok: false, reason: "bot_filtered" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }

        // 2. Real Human Visitor processing
        const todayStr = new Date().toISOString().split("T")[0];
        const visitorKey = `h_v_${todayStr}_${clientIp}`;

        // Increment human total views & daily views
        const humanTotalViews = parseInt(await env.STATS_KV.get("human_total_views") || "0", 10);
        await env.STATS_KV.put("human_total_views", (humanTotalViews + 1).toString());

        const humanTodayViews = parseInt(await env.STATS_KV.get(`human_views_${todayStr}`) || "0", 10);
        await env.STATS_KV.put(`human_views_${todayStr}`, (humanTodayViews + 1).toString());

        let isNewUnique = false;
        const alreadySeen = await env.STATS_KV.get(visitorKey);
        if (!alreadySeen) {
          isNewUnique = true;
          await env.STATS_KV.put(visitorKey, "1", { expirationTtl: 172800 });

          const humanTotalUniques = parseInt(await env.STATS_KV.get("human_total_uniques") || "0", 10);
          await env.STATS_KV.put("human_total_uniques", (humanTotalUniques + 1).toString());

          const humanTodayUniques = parseInt(await env.STATS_KV.get(`human_uniques_${todayStr}`) || "0", 10);
          await env.STATS_KV.put(`human_uniques_${todayStr}`, (humanTodayUniques + 1).toString());
        }

        // Store location pin data
        const city = cf.city || "Greenfield";
        const region = cf.region || cf.regionCode || "IN";
        const country = cf.country || "US";
        const lat = parseFloat(cf.latitude) || 39.785;
        const lon = parseFloat(cf.longitude) || -85.769;

        let locations = [];
        try {
          const locRaw = await env.STATS_KV.get("human_locations");
          if (locRaw) locations = JSON.parse(locRaw);
        } catch(e) {}

        const locKey = `${city}, ${region} ${country}`.trim();
        const existing = locations.find(l => l.key === locKey || (Math.abs(l.lat - lat) < 0.05 && Math.abs(l.lon - lon) < 0.05));
        if (existing) {
          existing.count += 1;
          existing.lastSeen = new Date().toISOString();
        } else {
          locations.unshift({
            key: locKey,
            city,
            region,
            country,
            lat,
            lon,
            count: 1,
            lastSeen: new Date().toISOString()
          });
          if (locations.length > 50) locations = locations.slice(0, 50);
        }

        await env.STATS_KV.put("human_locations", JSON.stringify(locations));

        return new Response(JSON.stringify({ ok: true, isNewUnique }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500 });
      }
    }

    // API endpoint for Coach Portal stats & map pins
    if (url.pathname === "/api/stats") {
      try {
        const totalUniques = parseInt(await env.STATS_KV.get("human_total_uniques") || "0", 10);
        const totalViews = parseInt(await env.STATS_KV.get("human_total_views") || "0", 10);
        const rawTotalUniques = parseInt(await env.STATS_KV.get("total_uniques") || "0", 10);

        const todayStr = new Date().toISOString().split("T")[0];
        const todayUniques = parseInt(await env.STATS_KV.get(`human_uniques_${todayStr}`) || "0", 10);
        const todayViews = parseInt(await env.STATS_KV.get(`human_views_${todayStr}`) || "0", 10);

        let locations = [];
        try {
          const locRaw = await env.STATS_KV.get("human_locations");
          if (locRaw) locations = JSON.parse(locRaw);
        } catch(e) {}

        return new Response(JSON.stringify({
          ok: true,
          humanUniques: totalUniques,
          humanViews: totalViews,
          rawUniques: rawTotalUniques,
          todayUniques,
          todayViews,
          locations,
          timestamp: new Date().toISOString()
        }), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store, no-cache, must-revalidate"
          }
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500 });
      }
    }

    // Serve static assets
    return await env.ASSETS.fetch(request);
  }
};
