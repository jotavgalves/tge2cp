export async function onRequest(context) {
  const { request, env } = context;
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });

  const json = (data, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" }
  });

  try {
    if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);

    const db = supabase(env);
    // Pega 2 questões abertas aleatórias
    const openQs = await db.req("GET", "tge_questions", { query: "?kind=eq.open&active=eq.true&limit=2" });
    if (!openQs.length) return json({ error: "Nenhuma questão aberta disponível." });

    // Cria tentativa fictícia
    const attemptId = crypto.randomUUID();
    const attemptQuestions = openQs.map((q, i) => ({
      attempt_id: attemptId,
      question_id: q.id,
      kind: "open",
      prompt: q.prompt,
      expected_answer: q.expected_answer,
      rubric: q.rubric,
      order_index: i,
      status: "locked",
      answer_text: `Resposta de teste ${i+1}`
    }));

    // Corrige via IA
    const aiResults = await correctOpenWithAI(attemptQuestions, env, db, attemptId);

    return json({ attemptId, aiResults, attemptQuestions });

  } catch (e) {
    return json({ error: String(e.message || e) }, 500);
  }
}

function supabase(env) {
  const base = env.SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY;
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
    try { data = txt ? JSON.parse(txt) : null; } catch {}
    if (!res.ok) throw new Error(data?.message || "Erro no banco de dados.");
    return data;
  }
  return { req };
}
