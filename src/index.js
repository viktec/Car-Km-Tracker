const TELEGRAM_API = "https://api.telegram.org";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function todayInTimeZone(timeZone = "UTC") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function daysInclusive(start, end) {
  const a = Date.parse(start + "T00:00:00Z");
  const b = Date.parse(end + "T00:00:00Z");
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

function daysBetween(a, b) {
  const x = Date.parse(a + "T00:00:00Z");
  const y = Date.parse(b + "T00:00:00Z");
  return Math.round((y - x) / 86400000);
}

function formatNumber(n) {
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 }).format(n);
}

function parsePositiveNumber(value) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeCategory(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\\/+/, "")
    .replace(/[^a-z0-9àèéìòù_-]/gi, "")
    .slice(0, 32);
}

async function telegram(env, method, body) {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const response = await fetch(
    `${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    }
  );
  if (!response.ok) throw new Error(`Telegram API error: ${response.status}`);
  return response.json();
}

async function sendMessage(env, chatId, text, replyMarkup = undefined) {
  const body = { chat_id: chatId, text };
  if (replyMarkup) body.reply_markup = replyMarkup;
  return telegram(env, "sendMessage", body);
}

async function getContract(env, userId) {
  return env.DB.prepare(
    "SELECT * FROM contracts WHERE user_id = ? ORDER BY id DESC LIMIT 1"
  ).bind(String(userId)).first();
}

async function ensureContract(env, userId, name = "Car") {
  const existing = await getContract(env, userId);
  if (existing) return existing;
  return null;
}

function helpText() {
  return [
    "🚗 Car-Km-Tracker",
    "",
    "Configura un contratto:",
    "/contratto 2026-06-18 2027-06-18 15000",
    "",
    "Comandi:",
    "/km 5080 - registra il contachilometri",
    "/annulla - annulla l'ultima lettura km",
    "/categoria urbino - crea una categoria personalizzata",
    "/urbino 70 - registra 70 km nella categoria Urbino",
    "/distanza Senigallia | Urbino - calcola la distanza stradale",
    "/ufficio 70",
    "/palestra 6",
    "/spesa 25",
    "/viaggio 300",
    "/trasferta 120",
    "/oggi - riepilogo di oggi",
    "/settimana - riepilogo ultimi 7 giorni",
    "/mese - riepilogo del mese",
    "/anno - riepilogo dell'anno",
    "/statistiche - stato del contratto",
    "/riepilogo - statistiche principali",
    "/categorie - categorie usate",
    "/help - aiuto"
  ].join("\n");
}

async function createContract(env, userId, args) {
  if (args.length < 3) {
    return "Uso: /contratto YYYY-MM-DD YYYY-MM-DD KM\nEsempio: /contratto 2026-06-18 2027-06-18 15000";
  }
  const [start, end, kmRaw] = args;
  const km = Number(kmRaw);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
      !Number.isInteger(km) || km <= 0 || daysBetween(start, end) < 0) {
    return "Parametri non validi. Usa: /contratto YYYY-MM-DD YYYY-MM-DD KM";
  }
  const current = await getContract(env, userId);
  if (current) {
    return "Hai già un contratto attivo. La gestione di più contratti sarà aggiunta in una fase successiva.";
  }
  await env.DB.prepare(
    "INSERT INTO contracts (user_id, name, start_date, end_date, allowed_km) VALUES (?, 'Car', ?, ?, ?)"
  ).bind(String(userId), start, end, km).run();
  return `✅ Contratto creato: ${formatNumber(km)} km dal ${start} al ${end}.`;
}

async function addCategory(env, userId, rawCategory) {
  const contract = await ensureContract(env, userId);
  if (!contract) return "Prima configura il contratto con /contratto YYYY-MM-DD YYYY-MM-DD KM.";
  const category = normalizeCategory(rawCategory);
  if (!category) return "Uso: /categoria urbino";
  await env.DB.prepare(
    "INSERT OR IGNORE INTO categories (contract_id, name) VALUES (?, ?)"
  ).bind(contract.id, category).run();
  return `✅ Categoria "/${category}" creata. Ora puoi usare /${category} 70.`;
}

async function addOdometer(env, userId, value) {
  const contract = await ensureContract(env, userId);
  if (!contract) return "Prima configura il contratto con /contratto YYYY-MM-DD YYYY-MM-DD KM.";
  const previous = await env.DB.prepare(
    "SELECT reading_km FROM odometer_readings WHERE contract_id = ? ORDER BY id DESC LIMIT 1"
  ).bind(contract.id).first();
  if (previous && value < previous.reading_km) {
    return `❌ Il nuovo valore (${formatNumber(value)} km) è inferiore all'ultima lettura (${formatNumber(previous.reading_km)} km).`;
  }
  await env.DB.prepare(
    "INSERT INTO odometer_readings (contract_id, reading_km) VALUES (?, ?)"
  ).bind(contract.id, value).run();
  if (!previous) {
    return `✅ Contachilometri registrato: ${formatNumber(value)} km.\nDa ora i km usati dal contratto sono ${formatNumber(value)} km.`;
  }
  return `✅ Contachilometri aggiornato a ${formatNumber(value)} km.\nKm usati dal contratto: ${formatNumber(value)} km.`;
}

async function undoLastOdometer(env, userId) {
  const contract = await ensureContract(env, userId);
  if (!contract) return { ok: false, text: "Nessun contratto configurato." };
  const last = await env.DB.prepare(
    "SELECT id, reading_km FROM odometer_readings WHERE contract_id = ? ORDER BY id DESC LIMIT 1"
  ).bind(contract.id).first();
  if (!last) return { ok: false, text: "Non c'è nessuna lettura km da annullare." };
  await env.DB.prepare(
    "DELETE FROM odometer_readings WHERE id = ? AND contract_id = ?"
  ).bind(last.id, contract.id).run();
  return {
    ok: true,
    text: `↩️ Annullata l'ultima lettura: ${formatNumber(last.reading_km)} km.`
  };
}

async function addTrip(env, userId, category, value, note = null) {
  const contract = await ensureContract(env, userId);
  if (!contract) return "Prima configura il contratto con /contratto YYYY-MM-DD YYYY-MM-DD KM.";
  const cleanCategory = normalizeCategory(category) || "other";
  const date = todayInTimeZone(env.TIME_ZONE || "UTC");
  await env.DB.prepare(
    "INSERT INTO categories (contract_id, name) VALUES (?, ?) ON CONFLICT(contract_id, name) DO NOTHING"
  ).bind(contract.id, cleanCategory).run();
  await env.DB.prepare(
    "INSERT INTO trips (contract_id, date, category, km, note) VALUES (?, ?, ?, ?, ?)"
  ).bind(contract.id, date, cleanCategory, value, note).run();
  return `✅ Registrati ${formatNumber(value)} km: ${cleanCategory}.`;
}

async function geocodePlace(place) {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", place);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "it");
  const response = await fetch(url.toString(), {
    headers: { "accept": "application/json", "user-agent": "Car-Km-Tracker/1.0" }
  });
  if (!response.ok) throw new Error(`Geocoding failed: ${response.status}`);
  const results = await response.json();
  if (!results?.length) return null;
  return { lat: Number(results[0].lat), lon: Number(results[0].lon), displayName: results[0].display_name };
}

async function calculateRoadDistance(from, to) {
  const [a, b] = await Promise.all([geocodePlace(from), geocodePlace(to)]);
  if (!a || !b) return null;
  const url = `${OSRM_URL}/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Routing failed: ${response.status}`);
  const data = await response.json();
  if (data.code !== "Ok" || !data.routes?.length) return null;
  return { km: Math.round((Number(data.routes[0].distance) / 1000) * 10) / 10, from: a.displayName, to: b.displayName };
}

async function routeDistance(env, userId, from, to) {
  const contract = await ensureContract(env, userId);
  if (!contract) return { text: "Prima configura il contratto con /contratto YYYY-MM-DD YYYY-MM-DD KM." };
  if (!from || !to) return { text: "Uso: /distanza Punto di partenza | Punto di arrivo\nEsempio: /distanza Senigallia | Urbino" };
  try {
    const route = await calculateRoadDistance(from, to);
    if (!route) return { text: "❌ Non trovo uno dei due punti. Prova con località e provincia, es. Senigallia, AN | Urbino, PU." };
    const pending = await env.DB.prepare(
      "INSERT INTO pending_routes (contract_id, from_place, to_place, distance_km) VALUES (?, ?, ?, ?) RETURNING id"
    ).bind(contract.id, from.trim(), to.trim(), route.km).first();
    return {
      text: [
        "📍 Distanza stradale calcolata",
        `Da: ${from.trim()}`,
        `A: ${to.trim()}`,
        `Percorso: ${formatNumber(route.km)} km`,
        "",
        "Premi il pulsante per aggiungere la distanza ai viaggi."
      ].join("\n"),
      replyMarkup: {
        inline_keyboard: [[
          { text: `➕ Aggiungi ${formatNumber(route.km)} km`, callback_data: `add_route:${pending.id}` }
        ]]
      }
    };
  } catch (error) {
    console.error("routeDistance", error);
    return { text: "❌ Errore nel calcolo della distanza. Riprova tra poco o specifica meglio i luoghi." };
  }
}

async function addPendingRoute(env, userId, routeId) {
  const contract = await ensureContract(env, userId);
  if (!contract) return { ok: false, text: "Nessun contratto configurato." };
  const route = await env.DB.prepare(
    "SELECT id, from_place, to_place, distance_km FROM pending_routes WHERE id = ? AND contract_id = ?"
  ).bind(routeId, contract.id).first();
  if (!route) return { ok: false, text: "Percorso non trovato o già aggiunto." };
  const date = todayInTimeZone(env.TIME_ZONE || "UTC");
  const note = `${route.from_place} → ${route.to_place}`;
  await env.DB.prepare(
    "INSERT INTO categories (contract_id, name) VALUES (?, 'percorso') ON CONFLICT(contract_id, name) DO NOTHING"
  ).bind(contract.id).run();
  await env.DB.prepare(
    "INSERT INTO trips (contract_id, date, category, km, note) VALUES (?, ?, 'percorso', ?, ?)"
  ).bind(contract.id, date, route.distance_km, note).run();
  await env.DB.prepare("DELETE FROM pending_routes WHERE id = ?").bind(route.id).run();
  return { ok: true, text: `✅ Aggiunti ${formatNumber(route.distance_km)} km.\n${note}` };
}

async function usageStats(env, contract) {
  const last = await env.DB.prepare(
    "SELECT reading_km FROM odometer_readings WHERE contract_id = ? ORDER BY id DESC LIMIT 1"
  ).bind(contract.id).first();
  const trip = await env.DB.prepare(
    "SELECT COALESCE(SUM(km), 0) AS km FROM trips WHERE contract_id = ?"
  ).bind(contract.id).first();

  // The odometer is an absolute vehicle mileage value. The contract usage
  // therefore equals the latest odometer reading, not the delta from the
  // first reading entered in the bot.
  const odometerKm = last ? Number(last.reading_km) : null;
  const usedKm = odometerKm ?? Number(trip.km || 0);
  const remaining = contract.allowed_km - usedKm;
  const today = todayInTimeZone(env.TIME_ZONE || "UTC");
  const elapsed = Math.max(0, Math.min(daysInclusive(contract.start_date, today), daysInclusive(contract.start_date, contract.end_date)));
  const totalDays = daysInclusive(contract.start_date, contract.end_date);
  const remainingDays = Math.max(0, daysInclusive(today, contract.end_date));
  const dailyBudget = remainingDays > 0 ? Math.max(0, remaining) / remainingDays : 0;
  const avgDaily = elapsed > 0 ? usedKm / elapsed : 0;
  const projected = usedKm + avgDaily * Math.max(0, totalDays - elapsed);
  const percent = contract.allowed_km > 0 ? (usedKm / contract.allowed_km) * 100 : 0;

  return { usedKm, remaining, elapsed, totalDays, remainingDays, dailyBudget, avgDaily, projected, percent, today, odometerKm, tripKm: Number(trip.km || 0) };
}

async function statsText(env, contract, detailed = true) {
  const s = await usageStats(env, contract);
  const status = s.percent <= 80 ? "🟢" : s.percent <= 100 ? "🟡" : "🔴";
  const lines = [
    `🚗 ${contract.name}`,
    `Periodo: ${contract.start_date} → ${contract.end_date}`,
    `Limite: ${formatNumber(contract.allowed_km)} km`,
    `Usati: ${formatNumber(s.usedKm)} km (${formatNumber(s.percent)}%)`,
    `Residui: ${formatNumber(s.remaining)} km`,
    `Media: ${formatNumber(s.avgDaily)} km/giorno`,
    `Budget residuo: ${formatNumber(s.dailyBudget)} km/giorno`,
    `Proiezione finale: ${formatNumber(s.projected)} km`,
    `Stato: ${status}`
  ];
  if (detailed) {
    lines.push(`Lettura odometro attuale: ${formatNumber(s.odometerKm ?? 0)} km`);
    lines.push(`Viaggi registrati: ${formatNumber(s.tripKm)} km`);
  }
  return lines.join("\n");
}

async function periodText(env, contract, period) {
  const today = todayInTimeZone(env.TIME_ZONE || "UTC");
  let start = today;
  if (period === "week") {
    const d = new Date(today + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - 6);
    start = d.toISOString().slice(0, 10);
  } else if (period === "month") {
    start = today.slice(0, 8) + "01";
  } else if (period === "year") {
    start = today.slice(0, 5) + "01-01";
  }
  const row = await env.DB.prepare(
    "SELECT COALESCE(SUM(km),0) AS km, COUNT(*) AS trips FROM trips WHERE contract_id = ? AND date BETWEEN ? AND ?"
  ).bind(contract.id, start, today).first();
  return `📅 ${period === "week" ? "Ultimi 7 giorni" : period === "month" ? "Questo mese" : period === "year" ? "Questo anno" : "Oggi"}\nKm registrati come viaggi: ${formatNumber(Number(row.km || 0))}\nNumero viaggi: ${row.trips}`;
}

async function categoriesText(env, contract) {
  const rows = await env.DB.prepare(
    "SELECT c.name AS category, COALESCE(SUM(t.km), 0) AS km, COUNT(t.id) AS trips FROM categories c LEFT JOIN trips t ON t.contract_id = c.contract_id AND t.category = c.name WHERE c.contract_id = ? GROUP BY c.name ORDER BY km DESC, c.name"
  ).bind(contract.id).all();
  if (!rows.results.length) return "Nessuna categoria creata.";
  return ["📊 Categorie", ...rows.results.map(r => `• ${r.category}: ${formatNumber(Number(r.km))} km (${r.trips} viaggi)`)].join("\n");
}

async function handleCallback(update, env) {
  const callback = update.callback_query;
  const chatId = callback?.message?.chat?.id;
  if (!callback?.id || !chatId) return { ok: true };

  if (callback.data === "undo_last_odometer") {
    const result = await undoLastOdometer(env, chatId);
    await telegram(env, "answerCallbackQuery", {
      callback_query_id: callback.id,
      text: result.text
    });
    const contract = await getContract(env, chatId);
    if (contract) {
      await sendMessage(env, chatId, result.ok ? `${result.text}\n\n${await statsText(env, contract)}` : result.text);
    }
  } else if (callback.data === "show_stats") {
    await telegram(env, "answerCallbackQuery", {
      callback_query_id: callback.id,
      text: "Statistiche aggiornate"
    });
    const contract = await getContract(env, chatId);
    if (contract) await sendMessage(env, chatId, await statsText(env, contract));
  } else if (callback.data?.startsWith("add_route:")) {
    const routeId = Number(callback.data.split(":")[1]);
    const result = await addPendingRoute(env, chatId, routeId);
    await telegram(env, "answerCallbackQuery", {
      callback_query_id: callback.id,
      text: result.text
    });
    await sendMessage(env, chatId, result.text);
  }

  return { ok: true };
}

async function handleUpdate(request, env) {
  const update = await request.json();
  if (update.callback_query) return handleCallback(update, env);

  const message = update.message;
  if (!message?.chat?.id || typeof message.text !== "string") return { ok: true };
  const chatId = message.chat.id;
  const parts = message.text.trim().split(/\s+/);
  const command = (parts.shift() || "").toLowerCase().split("@")[0];
  const args = parts;

  let reply;
  let replyMarkup;
  if (command === "/start" || command === "/help") reply = helpText();
  else if (command === "/contratto") reply = await createContract(env, chatId, args);
  else {
    const contract = await getContract(env, chatId);
    if (!contract) reply = "Nessun contratto configurato. Usa /contratto YYYY-MM-DD YYYY-MM-DD KM.";
    else if (command === "/km") {
      const value = parsePositiveNumber(args[0]);
      reply = value ? await addOdometer(env, chatId, value) : "Uso: /km 5080";
      if (value) {
        replyMarkup = {
          inline_keyboard: [
            [
              { text: "↩️ Annulla ultimo invio", callback_data: "undo_last_odometer" },
              { text: "📊 Statistiche", callback_data: "show_stats" }
            ]
          ]
        };
      }
    } else if (command === "/annulla") {
      const result = await undoLastOdometer(env, chatId);
      reply = result.text;
    } else if (["/oggi", "/settimana", "/mese", "/anno"].includes(command)) {
      reply = await periodText(env, contract, command === "/settimana" ? "week" : command === "/mese" ? "month" : command === "/anno" ? "year" : "today");
    } else if (command === "/statistiche" || command === "/riepilogo") reply = await statsText(env, contract, command === "/statistiche");
    else if (command === "/categorie") reply = await categoriesText(env, contract);
    else if (command.startsWith("/")) {
      const value = parsePositiveNumber(args[0]);
      reply = value ? await addTrip(env, chatId, command.slice(1), value) : "Uso: /categoria KM, ad esempio /ufficio 70";
    } else reply = "Comando non riconosciuto. Usa /help.";
  }

  await sendMessage(env, chatId, reply, replyMarkup);
  return { ok: true };
}

export default {
  async fetch(request, env) {
    if (request.method === "GET") return new Response("Car-Km-Tracker online", { status: 200 });
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

    if (env.TELEGRAM_WEBHOOK_SECRET) {
      const received = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
      if (received !== env.TELEGRAM_WEBHOOK_SECRET) return new Response("Unauthorized", { status: 401 });
    }

    try {
      return json(await handleUpdate(request, env));
    } catch (error) {
      console.error(error);
      return json({ ok: false, error: "Internal error" }, 500);
    }
  }
};
