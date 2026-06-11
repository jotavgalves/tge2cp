export async function onRequest(context) {
  const { request, env } = context;
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });

  const json = (data, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" }
  });

  try {
    if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);
    const b = await body(request);
    if (!env.ADMIN_LOG_PASSWORD || b.password !== env.ADMIN_LOG_PASSWORD) {
      return json({ error: "Senha administrativa incorreta." }, 401);
    }

    let providers = [];
    try {
      providers = JSON.parse(env.LLM_PROVIDERS_JSON || "[]");
    } catch (_) {
      return json({ error: "A variável LLM_PROVIDERS_JSON está mal formatada. Ela precisa ser um JSON válido." }, 400);
    }

    providers = providers.sort((a, b) => (a.priority || 99) - (b.priority || 99));

    if (!providers.length) {
      return json({ error: "Nenhuma IA foi configurada em LLM_PROVIDERS_JSON." }, 400);
    }

    const prompt = "Responda somente JSON válido, sem markdown: {\"ok\":true,\"resumo\":\"IA funcionando\"}";
    const results = [];

    for (const provider of providers) {
      const startedAt = Date.now();
      try {
        const text = await callProvider(provider, prompt);
        const parsed = parseJson(text);
        results.push({
          name: provider.name || provider.type || "IA",
          type: provider.type || "desconhecido",
          model: provider.model || "não informado",
          status: parsed?.ok === true ? "ok" : "ok_format_warning",
          message: parsed?.resumo || "A IA respondeu, mas o JSON veio em formato inesperado.",
          latencyMs: Date.now() - startedAt
        });
      } catch (e) {
        results.push({
          name: provider.name || provider.type || "IA",
          type: provider.type || "desconhecido",
          model: provider.model || "não informado",
          status: "error",
          message: translateError(e),
          latencyMs: Date.now() - startedAt
        });
      }
    }

    return json({
      testedAt: new Date().toISOString(),
      count: results.length,
      results
    });
  } catch (e) {
    return json({ error: translateError(e) }, 500);
  }
}

async function body(request) {
  try { return await request.json(); } catch (_) { return {}; }
}

function translateError(e) {
  const raw = String(e?.message || e || "");
  if (raw.includes("quota") || raw.includes("rate") || raw.includes("429")) return "Cota ou limite de uso atingido.";
  if (raw.includes("401") || raw.includes("403") || raw.toLowerCase().includes("api key")) return "Chave inválida, sem permissão ou bloqueada.";
  if (raw.includes("404") || raw.toLowerCase().includes("model")) return "Modelo não encontrado ou indisponível nessa conta.";
  if (raw.includes("JSON") || raw.includes("Unexpected")) return "A IA respondeu, mas não devolveu JSON válido.";
  if (raw.includes("fetch")) return "Falha de conexão com o provedor.";
  return raw && raw.length < 180 ? raw : "A IA falhou sem informar um erro claro.";
}

function parseJson(text) {
  const clean = String(text || "").replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(clean);
}

async function callProvider(provider, prompt) {
  if (provider.type === "gemini") return callGemini(provider, prompt);
  if (provider.type === "openai_compatible") return callOpenAICompatible(provider, prompt);
  throw new Error("Tipo de IA não reconhecido: " + String(provider.type || "vazio"));
}

async function callGemini(provider, prompt) {
  const model = provider.model || "gemini-2.0-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${provider.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 120, responseMimeType: "application/json" }
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Falha no Gemini.");
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
}

async function callOpenAICompatible(provider, prompt) {
  const res = await fetch(provider.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 120
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || data?.message || "Falha no provedor de IA.");
  return data.choices?.[0]?.message?.content || "";
}
