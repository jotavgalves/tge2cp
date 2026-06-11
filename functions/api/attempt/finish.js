export async function onRequest(context){
  const {request,env}=context;
  const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Allow-Methods":"POST, OPTIONS"};
  if(request.method==="OPTIONS")return new Response(null,{headers:cors});
  const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
  try{
    if(request.method!=="POST")return json({error:"Método não permitido."},405);
    const db=supabase(env);
    const user=await verify(request,env);
    const b=await body(request);
    if(!b.attemptId)throw new Error("Tentativa não encontrada.");

    const rows=await db.req("GET","tge_attempt_questions",{query:`?attempt_id=eq.${b.attemptId}&select=*,tge_questions(id,prompt,expected_answer,rubric,topic)`});
    if(!rows.length)throw new Error("Nenhuma questão foi encontrada nesta tentativa.");
    if(rows.some(r=>r.status!=="locked"))throw new Error("Responda todas as questões antes de finalizar.");

    let fallbackPrompt=null;
    const openRows=rows.filter(r=>r.kind==="open");
    if(openRows.length){
      try{
        const aiResults=await correctOpenWithAI(openRows,env,db,b.attemptId);
        for(const r of aiResults){
          await db.req("PATCH","tge_attempt_questions",{query:`?id=eq.${r.attemptQuestionId}`,body:{open_score:r.score,ai_comment:r.comment,ai_status:"corrected"}});
        }
      }catch(e){
        fallbackPrompt=buildFallbackPrompt(openRows,rows);
        await db.req("POST","ai_provider_logs",{body:{provider_name:"fallback",status:"limit_or_error",message:translateError(e),attempt_id:b.attemptId,created_at:new Date().toISOString()}});
        for(const r of openRows){
          await db.req("PATCH","tge_attempt_questions",{query:`?id=eq.${r.id}`,body:{open_score:null,ai_comment:"A IA não conseguiu corrigir automaticamente. Use a correção alternativa.",ai_status:"ai_limit"}});
        }
      }
    }

    const fresh=await db.req("GET","tge_attempt_questions",{query:`?attempt_id=eq.${b.attemptId}&select=*,tge_questions(id,prompt,expected_answer,rubric,topic)`});
    const result=await buildResult(db,fresh,fallbackPrompt);
    await db.req("PATCH","tge_attempts",{query:`?id=eq.${b.attemptId}`,body:{status:"finished",finished_at:new Date().toISOString(),score:result.score,coefficient:result.coefficient,total_time_ms:result.totalTimeMs}});
    result.attemptNumber=(await db.req("GET","tge_attempts",{query:`?user_id=eq.${user.id}&select=id`})).length;
    return json({result});
  }catch(e){
    console.error(e);
    return json({error:translateError(e)},500);
  }
}

function supabase(env){
  const base=env.SUPABASE_URL,key=env.SUPABASE_SERVICE_ROLE_KEY;
  if(!base||!key)throw new Error("Supabase não configurado corretamente.");
  async function req(method,table,{body=null,query=""}={}){
    const res=await fetch(`${base}/rest/v1/${table}${query}`,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=representation"},body:body?JSON.stringify(body):undefined});
    const txt=await res.text();let data=null;try{data=txt?JSON.parse(txt):null}catch{data=txt}
    if(!res.ok)throw new Error(data?.message||data?.error_description||data?.error||"Erro no banco de dados.");
    return data;
  }
  return{req};
}
async function body(request){try{return await request.json()}catch{return{}}}
function b64buf(buf){return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function atoburl(str){return decodeURIComponent(escape(atob(str.replace(/-/g,"+").replace(/_/g,"/"))))}
async function verify(request,env){
  const token=(request.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
  if(!token)throw new Error("Você precisa entrar novamente.");
  const[h,p,s]=token.split(".");
  const enc=new TextEncoder();
  const key=await crypto.subtle.importKey("raw",enc.encode(env.SESSION_SECRET||"dev-secret"),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const sig=await crypto.subtle.sign("HMAC",key,enc.encode(`${h}.${p}`));
  if(b64buf(sig)!==s)throw new Error("Sua sessão expirou. Entre novamente.");
  const payload=JSON.parse(atoburl(p));
  if(payload.exp<Date.now())throw new Error("Sua sessão expirou. Entre novamente.");
  return payload;
}
function translateError(e){
  const raw=String(e?.message||e||"");
  if(raw.includes("quota")||raw.includes("rate")||raw.includes("429"))return"A IA atingiu o limite por enquanto.";
  if(raw.includes("401")||raw.includes("403")||raw.toLowerCase().includes("api key"))return"Uma chave de IA está inválida, sem permissão ou bloqueada.";
  if(raw.includes("404")||raw.toLowerCase().includes("model"))return"Um modelo de IA não foi encontrado ou não está disponível.";
  if(raw.includes("JWT")||raw.includes("token"))return"Sua sessão expirou. Entre novamente.";
  if(raw.includes("permission denied"))return"O Supabase recusou a permissão. Confira a secret key no Cloudflare.";
  if(raw.includes("JSON")||raw.includes("Unexpected"))return"A IA respondeu em formato inválido.";
  if(raw.includes("fetch"))return"Não consegui conectar com o servidor agora.";
  return raw&&raw.length<180?raw:"O sistema encontrou um problema. Tente novamente.";
}
async function correctOpenWithAI(openRows,env,db,attemptId){
  const prompt=buildCorrectionPrompt(openRows);
  let providers=[];
  try{providers=JSON.parse(env.LLM_PROVIDERS_JSON||"[]")}catch{throw new Error("A lista de IAs está mal configurada no Cloudflare.")}
  providers=providers.filter(p=>p&&p.type&&p.apiKey).sort((a,b)=>(a.priority||99)-(b.priority||99));
  if(!providers.length)throw new Error("Nenhuma IA foi configurada no Cloudflare.");
  let lastError=null;
  for(const provider of providers){
    const started=Date.now();
    try{
      const text=await callProvider(provider,prompt);
      const parsed=parseJsonLoose(text);
      if(!Array.isArray(parsed.results))throw new Error("A IA respondeu fora do formato esperado.");
      const results=openRows.map(row=>{
        const found=parsed.results.find(x=>String(x.attemptQuestionId)===String(row.id)||String(x.questionId)===String(row.question_id))||{};
        const score=Math.max(0,Math.min(2,Number(found.score ?? 0)));
        return{attemptQuestionId:row.id,score:Number.isFinite(score)?score:0,comment:String(found.comment||"Comentário não informado pela IA.").slice(0,220)};
      });
      await db.req("POST","ai_provider_logs",{body:{provider_name:provider.name||provider.type,status:"ok",message:`Correção realizada com sucesso em ${Date.now()-started}ms.`,attempt_id:attemptId,created_at:new Date().toISOString()}});
      return results;
    }catch(e){
      lastError=e;
      await db.req("POST","ai_provider_logs",{body:{provider_name:provider.name||provider.type||"IA",status:"error",message:translateError(e),attempt_id:attemptId,created_at:new Date().toISOString()}});
    }
  }
  throw lastError||new Error("Todas as IAs falharam.");
}
function buildCorrectionPrompt(rows){
  const payload=rows.map(r=>({attemptQuestionId:r.id,questionId:r.question_id,assunto:r.tge_questions?.topic||"TGE",pergunta:r.tge_questions?.prompt||"",espelho:r.tge_questions?.expected_answer||"",rubrica:r.tge_questions?.rubric||"",resposta:r.answer_text||"",tempoMs:r.time_ms||0}));
  return `Você é corretor de Teoria Geral do Estado. Corrija respostas abertas de prova difícil, em português do Brasil. Cada questão vale de 0 a 2 pontos. Use o espelho como referência, mas aceite respostas equivalentes. Critério: 0 = branco/fuga/erro grave; 0.5 = menciona o tema mas erra o núcleo; 1.0 = parcial com lacunas relevantes; 1.5 = acerta o núcleo com imprecisões; 2.0 = correta, técnica e suficiente. Não premie demora; use tempo só como indício de chute/resposta vazia. Responda SOMENTE JSON válido, sem markdown. Formato: {"results":[{"attemptQuestionId":"id","questionId":"id","score":1.5,"comment":"comentário curto e útil"}]}. Dados: ${JSON.stringify(payload)}`;
}
function buildFallbackPrompt(openRows,allRows){return buildCorrectionPrompt(openRows)+`\n\nContexto: fechadas respondidas ${allRows.filter(r=>r.kind==="closed").length}; tempo total ${allRows.reduce((s,r)=>s+(r.time_ms||0),0)}ms.`}
function parseJsonLoose(text){
  const s=String(text||"").replace(/```json/gi,"").replace(/```/g,"").trim();
  try{return JSON.parse(s)}catch{}
  const first=s.indexOf("{");const last=s.lastIndexOf("}");
  if(first>=0&&last>first)return JSON.parse(s.slice(first,last+1));
  throw new Error("A IA respondeu em formato inválido.");
}
async function callProvider(provider,prompt){
  if(provider.type==="gemini")return callGemini(provider,prompt);
  if(provider.type==="openai_compatible")return callOpenAICompatible(provider,prompt);
  throw new Error("Tipo de IA não reconhecido.");
}
async function callGemini(provider,prompt){
  const model=provider.model||"gemini-2.0-flash";
  const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${provider.apiKey}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.05,maxOutputTokens:1800,responseMimeType:"application/json"}})});
  const data=await res.json();
  if(!res.ok)throw new Error(data?.error?.message||"Falha no Gemini.");
  return data.candidates?.[0]?.content?.parts?.map(p=>p.text).join("")||"";
}
async function callOpenAICompatible(provider,prompt){
  const res=await fetch(provider.baseUrl,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${provider.apiKey}`},body:JSON.stringify({model:provider.model,messages:[{role:"system",content:"Responda somente JSON válido."},{role:"user",content:prompt}],temperature:0.05,max_tokens:1800})});
  const data=await res.json();
  if(!res.ok)throw new Error(data?.error?.message||data?.message||"Falha no provedor de IA.");
  return data.choices?.[0]?.message?.content||"";
}
async function buildResult(db,rows,fallbackPrompt=null){
  const closed=rows.filter(r=>r.kind==="closed"),open=rows.filter(r=>r.kind==="open");
  const closedScore=closed.reduce((s,r)=>s+Number(r.closed_score||0),0);
  const openScore=open.reduce((s,r)=>s+Number(r.open_score||0),0);
  const closedTotal=closed.length,openTotal=open.length*2,max=closedTotal+openTotal,raw=closedScore+openScore;
  const score=max?Math.round(raw/max*100)/10:0;
  const totalTimeMs=rows.reduce((s,r)=>s+Number(r.time_ms||0),0);
  const avg=(totalTimeMs/1000)/Math.max(1,rows.length);
  let tf=1;if(avg<6)tf=.62;else if(avg<14)tf=.82;else if(avg<=95)tf=1.04;else if(avg<=190)tf=.96;else tf=.82;
  const coefficient=max?Math.round(raw/max*100*tf*(open.length?1.08:1)*10)/10:0;
  const qids=closed.map(r=>r.question_id);
  const opts=qids.length?await db.req("GET","tge_options",{query:`?question_id=in.(${qids.join(",")})&select=id,question_id,text,is_correct`}):[];
  const by={};opts.forEach(o=>{by[o.question_id]=by[o.question_id]||[];by[o.question_id].push({id:o.id,text:o.text,isCorrect:o.is_correct})});
  const corrections=rows.sort((a,b)=>a.order_index-b.order_index).map(r=>{
    const options=by[r.question_id]||[];
    return{order:r.order_index,kind:r.kind,prompt:r.tge_questions?.prompt||"",score:r.kind==="open"?Number(r.open_score||0):Number(r.closed_score||0),maxScore:r.kind==="open"?2:1,comment:r.ai_comment||"",answerText:r.answer_text||"",selectedOptionId:r.selected_option_id,correctOptionId:options.find(o=>o.isCorrect)?.id||null,isCorrect:r.is_correct,options:options.map(o=>({id:o.id,text:o.text}))};
  });
  return{score,closedScore,closedTotal,openScore,openTotal,coefficient,avgTimeMs:rows.length?totalTimeMs/rows.length:0,totalTimeMs,fallbackPrompt,corrections};
}
