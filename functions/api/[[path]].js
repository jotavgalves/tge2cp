export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, "");

  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        ...cors,
        "Content-Type": "application/json; charset=utf-8"
      }
    });

  const fail = (msg, status = 400) => json({ error: msg }, status);

  try {
    const db = supabase(env);

    if (path === "login" && request.method === "POST") {
      return json(await login(request, env, db));
    }

    if (path === "visitor/start" && request.method === "POST") {
      return json(await visitorStart(request, db));
    }

    if (path === "visitor/check" && request.method === "POST") {
      return json(await visitorCheck(request, db));
    }

    if (path === "attempt/start" && request.method === "POST") {
      return json(await guestStart(request, env, db));
    }

    if (path === "attempt/answer" && request.method === "POST") {
      return json(await guestAnswer(request, env, db));
    }

    if (path === "attempt/finish" && request.method === "POST") {
      return json(await guestFinish(request, env, db));
    }

    if (path === "ranking" && request.method === "GET") {
      return json(await ranking(request, env, db));
    }

    if (path === "admin/logs" && request.method === "POST") {
      return json(await adminLogs(request, env, db));
    }

    return fail("Caminho não encontrado.", 404);
  } catch (e) {
    console.error(e);
    return fail(translateError(e), 500);
  }
}

function translateError(e) {
  const raw = String(e?.message || e || "");

  if (raw.includes("quota") || raw.includes("rate") || raw.includes("429")) {
    return "A IA atingiu o limite por enquanto.";
  }

  if (raw.includes("JWT") || raw.includes("token")) {
    return "Sua sessão expirou. Entre novamente.";
  }

  if (raw.includes("Supabase")) {
    return "Supabase não configurado corretamente.";
  }

  if (raw.includes("fetch")) {
    return "Não consegui conectar ao servidor agora.";
  }

  return raw && raw.length < 150
    ? raw
    : "O sistema encontrou um problema. Tente novamente.";
}

function supabase(env) {
  const base = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!base || !key) {
    throw new Error("Supabase não configurado corretamente.");
  }

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
    try {
      data = txt ? JSON.parse(txt) : null;
    } catch (e) {
      data = txt;
    }

    if (!res.ok) {
      throw new Error(data?.message || "Erro no banco de dados.");
    }

    return data;
  }

  async function rpc(name, body) {
    const res = await fetch(`${base}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body || {})
    });

    const txt = await res.text();

    let data = null;
    try {
      data = txt ? JSON.parse(txt) : null;
    } catch (e) {
      data = txt;
    }

    if (!res.ok) {
      throw new Error(data?.message || "Erro ao executar função no banco.");
    }

    return data;
  }

  return { req, rpc };
}

async function body(request) {
  try {
    return await request.json();
  } catch (e) {
    return {};
  }
}

function normName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function b64(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64buf(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function atoburl(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(str)));
}

async function sign(payload, secret) {
  const enc = new TextEncoder();

  const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const data = b64(
    JSON.stringify({
      ...payload,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 30
    })
  );

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${header}.${data}`)
  );

  return `${header}.${data}.${b64buf(sig)}`;
}

async function verify(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");

  if (!token) {
    throw new Error("Você precisa entrar novamente.");
  }

  const [h, p, s] = token.split(".");
  const enc = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(env.SESSION_SECRET || "dev-secret"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${h}.${p}`)
  );

  if (b64buf(sig) !== s) {
    throw new Error("Sua sessão expirou. Entre novamente.");
  }

  const payload = JSON.parse(atoburl(p));

  if (payload.exp < Date.now()) {
    throw new Error("Sua sessão expirou. Entre novamente.");
  }

  return payload;
}

async function login(request, env, db) {
  const b = await body(request);

  const rows = await db.rpc("verify_tge_guest_login", {
    p_name: normName(b.name),
    p_password: String(b.password || "")
  });

  const user = Array.isArray(rows) ? rows[0] : rows;

  if (!user || !user.user_id) {
    throw new Error("Nome ou senha incorretos.");
  }

  const token = await sign(
    {
      id: user.user_id,
      displayName: user.display_name,
      role: user.role
    },
    env.SESSION_SECRET || "dev-secret"
  );

  return {
    token,
    user: {
      id: user.user_id,
      displayName: user.display_name,
      role: user.role
    }
  };
}

async function fetchQuestions(db, kind) {
  const qs = await db.req("GET", "tge_questions", {
    query: `?kind=eq.${kind}&active=eq.true&select=*`
  });

  if (kind === "closed") {
    const ids = qs.map((q) => q.id);

    const opts = ids.length
      ? await db.req("GET", "tge_options", {
          query: `?question_id=in.(${ids.join(",")})&select=id,question_id,text`
        })
      : [];

    const by = {};

    opts.forEach((o) => {
      by[o.question_id] = by[o.question_id] || [];
      by[o.question_id].push(o);
    });

    qs.forEach((q) => {
      q.options = shuffle(by[q.id] || []);
    });
  }

  return qs;
}

function selectAdaptive(questions, stats, n) {
  stats = stats || {};

  const unseen = questions.filter((q) => !stats[q.id]);
  const wrong = questions.filter((q) => (stats[q.id]?.wrong || 0) > 0);
  const slow = [...questions].sort(
    (a, b) => (stats[b.id]?.totalTime || 0) - (stats[a.id]?.totalTime || 0)
  );

  const picked = [];

  const add = (list) => {
    for (const q of shuffle(list)) {
      if (picked.length < n && !picked.find((x) => x.id === q.id)) {
        picked.push(q);
      }
    }
  };

  add(unseen);
  add(wrong);
  add(slow);
  add(questions);

  return picked.slice(0, n);
}

function clientQuestion(q, i) {
  if (q.kind === "open") {
    return {
      id: q.id,
      kind: "open",
      prompt: q.prompt,
      locked: false,
      order: i + 1,
      viewStartedAt: Date.now()
    };
  }

  return {
    id: q.id,
    kind: "closed",
    prompt: q.prompt,
    options: shuffle(q.options || []).map((o) => ({
      id: o.id,
      text: o.text
    })),
    locked: false,
    order: i + 1,
    viewStartedAt: Date.now()
  };
}

async function visitorStart(request, db) {
  const b = await body(request);

  const closed = await fetchQuestions(db, "closed");

  if (closed.length < 1) {
    throw new Error("Nenhuma questão fechada ativa foi encontrada.");
  }

  const selected = selectAdaptive(closed, b.seen || {}, 20);

  return {
    attempt: {
      id: "visitor-" + crypto.randomUUID(),
      mode: "visitor",
      questions: selected.map((q, i) => clientQuestion(q, i))
    }
  };
}

async function visitorCheck(request, db) {
  const b = await body(request);

  const opts = await db.req("GET", "tge_options", {
    query: `?question_id=eq.${b.questionId}&is_correct=eq.true&select=id`
  });

  const correct = opts[0]?.id;

  return {
    isCorrect: correct === b.selectedOptionId,
    correctOptionId: correct
  };
}

async function loadUserStats(db, userId) {
  const attempts = await db.req("GET", "tge_attempts", {
    query: `?user_id=eq.${userId}&select=id`
  });

  const ids = attempts.map((a) => a.id);

  if (!ids.length) {
    return { closed: {}, open: {} };
  }

  const rows = await db.req("GET", "tge_attempt_questions", {
    query: `?attempt_id=in.(${ids.join(
      ","
    )})&select=question_id,kind,is_correct,open_score,time_ms`
  });

  const out = { closed: {}, open: {} };

  rows.forEach((r) => {
    const bag = r.kind === "open" ? out.open : out.closed;

    bag[r.question_id] = bag[r.question_id] || {
      seen: 0,
      wrong: 0,
      totalTime: 0
    };

    bag[r.question_id].seen++;
    bag[r.question_id].totalTime += r.time_ms || 0;

    if (r.kind === "closed" && !r.is_correct) {
      bag[r.question_id].wrong++;
    }

    if (r.kind === "open" && Number(r.open_score || 0) < 1.2) {
      bag[r.question_id].wrong++;
    }
  });

  return out;
}

async function guestStart(request, env, db) {
  const user = await verify(request, env);

  const attempts = await db.req("GET", "tge_attempts", {
    query: `?user_id=eq.${user.id}&select=id,has_open_questions`
  });

  const openDone = attempts.filter((a) => a.has_open_questions).length;
  const includeOpen = user.role === "admin" || openDone < 2;
  const closedCount = includeOpen ? 10 : 20;
  const openCount = includeOpen ? 10 : 0;

  const history = await loadUserStats(db, user.id);

  const closed = selectAdaptive(
    await fetchQuestions(db, "closed"),
    history.closed,
    closedCount
  ).map((q) => ({ ...q, kind: "closed" }));

  const open = openCount
    ? selectAdaptive(await fetchQuestions(db, "open"), history.open, openCount).map(
        (q) => ({ ...q, kind: "open" })
      )
    : [];

  const mixed = shuffle([...closed, ...open]);

  const attempt = (
    await db.req("POST", "tge_attempts", {
      body: {
        user_id: user.id,
        mode: "guest",
        has_open_questions: includeOpen,
        status: "in_progress",
        started_at: new Date().toISOString()
      }
    })
  )[0];

  const questions = [];

  for (let i = 0; i < mixed.length; i++) {
    const q = mixed[i];

    const row = (
      await db.req("POST", "tge_attempt_questions", {
        body: {
          attempt_id: attempt.id,
          question_id: q.id,
          order_index: i + 1,
          kind: q.kind,
          status: "draft"
        }
      })
    )[0];

    questions.push({
      ...clientQuestion(q, i),
      attemptQuestionId: row.id
    });
  }

  return {
    attempt: {
      id: attempt.id,
      mode: "guest",
      questions
    }
  };
}

async function guestAnswer(request, env, db) {
  await verify(request, env);

  const b = await body(request);

  const aq = (
    await db.req("GET", "tge_attempt_questions", {
      query: `?id=eq.${b.questionAttemptId}&select=*`
    })
  )[0];

  if (!aq) {
    throw new Error("Questão não encontrada.");
  }

  if (aq.status === "locked") {
    throw new Error("Esta resposta já foi travada.");
  }

  const patch = {
    status: "locked",
    time_ms: b.timeMs || 0
  };

  if (b.kind === "closed") {
    const correct = (
      await db.req("GET", "tge_options", {
        query: `?question_id=eq.${aq.question_id}&is_correct=eq.true&select=id`
      })
    )[0]?.id;

    patch.selected_option_id = b.selectedOptionId;
    patch.is_correct = correct === b.selectedOptionId;
    patch.closed_score = patch.is_correct ? 1 : 0;

    await db.req("PATCH", "tge_attempt_questions", {
      query: `?id=eq.${aq.id}`,
      body: patch
    });

    return {
      question: {
        locked: true,
        resultKnown: true,
        isCorrect: patch.is_correct,
        correctOptionId: correct,
        selectedOptionId: b.selectedOptionId,
        timeMs: patch.time_ms
      }
    };
  }

  patch.answer_text = String(b.answerText || "").slice(0, 1200);

  await db.req("PATCH", "tge_attempt_questions", {
    query: `?id=eq.${aq.id}`,
    body: patch
  });

  return {
    question: {
      locked: true,
      answerText: patch.answer_text,
      timeMs: patch.time_ms
    }
  };
}

async function guestFinish(request, env, db) {
  const user = await verify(request, env);
  const b = await body(request);

  const rows = await db.req("GET", "tge_attempt_questions", {
    query: `?attempt_id=eq.${b.attemptId}&select=*,tge_questions(*)`
  });

  if (rows.some((r) => r.status !== "locked")) {
    throw new Error("Responda todas as questões antes de finalizar.");
  }

  const fresh = await autoCorrectOpen(rows, env, db, b.attemptId);
  const result = buildResult(fresh);

  await db.req("PATCH", "tge_attempts", {
    query: `?id=eq.${b.attemptId}`,
    body: {
      status: "finished",
      finished_at: new Date().toISOString(),
      score: result.score,
      coefficient: result.coefficient,
      total_time_ms: result.totalTimeMs
    }
  });

  result.attemptNumber = (
    await db.req("GET", "tge_attempts", {
      query: `?user_id=eq.${user.id}&select=id`
    })
  ).length;

  return { result };
}

async function autoCorrectOpen(rows, env, db, attemptId) {
  const openRows = rows.filter((r) => r.kind === "open");

  if (!openRows.length) {
    return rows;
  }

  for (const r of openRows) {
    await db.req("PATCH", "tge_attempt_questions", {
      query: `?id=eq.${r.id}`,
      body: {
        open_score: 1.2,
        ai_comment: "Correção provisória: IA não configurada ou em teste.",
        ai_status: "fallback"
      }
    });
  }

  await db.req("POST", "ai_provider_logs", {
    body: {
      provider_name: "sistema",
      status: "ok",
      message:
        "Correção provisória aplicada. Configure LLM_PROVIDERS_JSON para IA real.",
      attempt_id: attemptId,
      created_at: new Date().toISOString()
    }
  });

  return await db.req("GET", "tge_attempt_questions", {
    query: `?attempt_id=eq.${attemptId}&select=*,tge_questions(*)`
  });
}

function buildResult(rows) {
  const closed = rows.filter((r) => r.kind === "closed");
  const open = rows.filter((r) => r.kind === "open");

  const closedScore = closed.reduce((s, r) => s + (r.closed_score || 0), 0);
  const openScore = open.reduce((s, r) => s + Number(r.open_score || 0), 0);

  const closedTotal = closed.length;
  const openTotal = open.length * 2;

  const max = closedTotal + openTotal;
  const raw = closedScore + openScore;

  const score = Math.round((raw / max) * 100) / 10;
  const totalTimeMs = rows.reduce((s, r) => s + (r.time_ms || 0), 0);
  const coefficient = Math.round((raw / max) * 1000) / 10;

  const corrections = rows
    .sort((a, b) => a.order_index - b.order_index)
    .map((r) => ({
      order: r.order_index,
      kind: r.kind,
      prompt: r.tge_questions.prompt,
      score: r.kind === "open" ? Number(r.open_score || 0) : r.closed_score,
      maxScore: r.kind === "open" ? 2 : 1,
      comment: r.ai_comment,
      answerText: r.answer_text,
      selectedOptionId: r.selected_option_id,
      correctOptionId: null,
      isCorrect: r.is_correct
    }));

  return {
    score,
    closedScore,
    closedTotal,
    openScore,
    openTotal,
    coefficient,
    avgTimeMs: totalTimeMs / rows.length,
    totalTimeMs,
    corrections
  };
}

async function ranking(request, env, db) {
  await verify(request, env);

  const rows = await db.req("GET", "tge_attempts", {
    query:
      "?status=eq.finished&select=id,user_id,score,coefficient,total_time_ms,finished_at,invited_users(display_name)&order=finished_at.desc"
  });

  const map = new Map();

  rows.forEach((r) => {
    const id = r.user_id;

    if (!map.has(id)) {
      map.set(id, {
        userId: id,
        displayName: r.invited_users?.display_name || "Usuário",
        attempts: 0,
        latestScore: 0,
        coefs: []
      });
    }

    const x = map.get(id);
    x.attempts++;

    if (x.attempts === 1) {
      x.latestScore = r.score;
    }

    x.coefs.push(Number(r.coefficient || 0));
  });

  return {
    ranking: [...map.values()]
      .map((x) => ({
        ...x,
        coefficient:
          Math.round(
            (x.coefs.reduce((a, b) => a + b, 0) / x.coefs.length) * 10
          ) / 10
      }))
      .sort((a, b) => b.coefficient - a.coefficient)
  };
}

async function adminLogs(request, env, db) {
  const b = await body(request);

  if (!env.ADMIN_LOG_PASSWORD || b.password !== env.ADMIN_LOG_PASSWORD) {
    throw new Error("Senha administrativa incorreta.");
  }

  const logs = await db.req("GET", "ai_provider_logs", {
    query: "?select=*&order=created_at.desc&limit=150"
  });

  return { logs };
}

function shuffle(arr) {
  const a = [...arr];

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
}
