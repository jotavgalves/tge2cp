export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const subpath = url.pathname.replace(/^\/api\/chat\/?/, "");
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });

  try {
    const db = supabase(env);
    if (subpath === "send" && request.method === "POST") return json(await chatSend(request, env, db));
    if (subpath === "list" && request.method === "GET") return json(await chatList(request, env, db));
    if (subpath === "unread" && request.method === "GET") return json(await chatUnread(request, env, db));
    if (subpath === "mark-read" && request.method === "POST") return json(await chatMarkRead(request, env, db));
    if (subpath === "readers" && request.method === "GET") return json(await chatReaders(request, env, db, url));
    return json({ error: "Caminho do chat não encontrado." }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: translateError(e) }, 500);
  }
}

function translateError(e) {
  const raw = String(e?.message || e || "");
  if (raw.includes("JWT") || raw.includes("token")) return "Sua sessão expirou. Entre novamente.";
  if (raw.includes("permission denied")) return "O Supabase recusou a permissão. Confira se a secret key correta está no Cloudflare.";
  if (raw.includes("duplicate key")) return "Essa visualização já foi registrada.";
  return raw && raw.length < 160 ? raw : "O chat encontrou um problema. Tente novamente.";
}

function supabase(env) {
  const base = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error("Supabase não configurado corretamente.");
  async function req(method, table, { body = null, query = "" } = {}) {
    const res = await fetch(`${base}/rest/v1/${table}${query}`, {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const txt = await res.text();
    let data = null;
    try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
    if (!res.ok) throw new Error(data?.message || "Erro no banco de dados.");
    return data;
  }
  return { req };
}

async function body(request) {
  try { return await request.json(); } catch { return {}; }
}

function b64buf(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function atoburl(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(str)));
}

async function verify(request, env) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Você precisa entrar novamente.");
  const [h, p, s] = token.split(".");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(env.SESSION_SECRET || "dev-secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${h}.${p}`));
  if (b64buf(sig) !== s) throw new Error("Sua sessão expirou. Entre novamente.");
  const payload = JSON.parse(atoburl(p));
  if (payload.exp < Date.now()) throw new Error("Sua sessão expirou. Entre novamente.");
  return payload;
}

async function getNames(db, ids) {
  const clean = [...new Set((ids || []).filter(Boolean))];
  if (!clean.length) return new Map();
  const rows = await db.req("GET", "invited_users", { query: `?id=in.(${clean.join(",")})&select=id,display_name` });
  return new Map(rows.map((r) => [r.id, r.display_name]));
}

async function chatSend(request, env, db) {
  const user = await verify(request, env);
  const b = await body(request);
  const msg = String(b.body || "").trim().slice(0, 500);
  if (!msg) throw new Error("Escreva uma mensagem.");
  const row = (await db.req("POST", "chat_messages", {
    body: { user_id: user.id, body: msg, created_at: new Date().toISOString() }
  }))[0];
  return { message: row };
}

async function chatList(request, env, db) {
  const user = await verify(request, env);
  const rows = await db.req("GET", "chat_messages", {
    query: "?select=id,user_id,body,created_at&order=created_at.asc&limit=160"
  });
  const names = await getNames(db, rows.map((r) => r.user_id));

  for (const m of rows) {
    if (m.user_id !== user.id) {
      try {
        await db.req("POST", "chat_reads", {
          body: { message_id: m.id, user_id: user.id, read_at: new Date().toISOString() }
        });
      } catch (_) {}
    }
  }

  return {
    messages: rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      displayName: names.get(r.user_id) || "Usuário",
      body: r.body,
      createdAt: r.created_at
    }))
  };
}

async function chatUnread(request, env, db) {
  const user = await verify(request, env);
  const rows = await db.req("GET", "chat_messages", { query: `?user_id=neq.${user.id}&select=id` });
  const ids = rows.map((r) => r.id);
  if (!ids.length) return { unread: 0 };
  const reads = await db.req("GET", "chat_reads", { query: `?user_id=eq.${user.id}&message_id=in.(${ids.join(",")})&select=message_id` });
  const seen = new Set(reads.map((r) => r.message_id));
  return { unread: ids.filter((id) => !seen.has(id)).length };
}

async function chatMarkRead(request, env, db) {
  const user = await verify(request, env);
  const b = await body(request);
  const msg = (await db.req("GET", "chat_messages", { query: `?id=eq.${b.messageId}&select=user_id` }))[0];
  if (!msg || msg.user_id === user.id) return { ok: true };
  try {
    await db.req("POST", "chat_reads", { body: { message_id: b.messageId, user_id: user.id, read_at: new Date().toISOString() } });
  } catch (_) {}
  return { ok: true };
}

async function chatReaders(request, env, db, url) {
  const user = await verify(request, env);
  const messageId = url.searchParams.get("messageId");
  const msg = (await db.req("GET", "chat_messages", { query: `?id=eq.${messageId}&select=user_id` }))[0];
  if (!msg) throw new Error("Mensagem não encontrada.");

  if (msg.user_id !== user.id) {
    try {
      await db.req("POST", "chat_reads", { body: { message_id: messageId, user_id: user.id, read_at: new Date().toISOString() } });
    } catch (_) {}
  }

  const reads = await db.req("GET", "chat_reads", { query: `?message_id=eq.${messageId}&select=user_id,read_at` });
  const filtered = reads.filter((r) => r.user_id !== msg.user_id);
  const names = await getNames(db, filtered.map((r) => r.user_id));
  return {
    readers: filtered.map((r) => ({ displayName: names.get(r.user_id) || "Usuário", readAt: r.read_at }))
  };
}
