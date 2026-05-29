import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PLANNER_SYSTEM_PROMPT = `Voce e um agente especialista em criacao de calendarios editoriais estrategicos para Instagram, focado em profissionais da saude, especialmente Cirurgia e Traumatologia Bucomaxilofacial e Odontologia Hospitalar.

Sua funcao e criar um plano editorial completo e detalhado, dia a dia, transformando temas tecnicos em conteudos humanos, sofisticados e persuasivos, mantendo autoridade medica sem parecer comercial.

O publico-alvo sao adultos de classe media para cima, com dor, medo, inseguranca, experiencias frustradas anteriores, casos complexos ou necessidade de um especialista.

Tom: premium, elegante, humano, acolhedor, tecnico na medida certa, com autoridade silenciosa, sem linguagem agressiva de venda.

CTAs PROIBIDOS: "Agende uma consulta", "Marque sua avaliacao", "Entre em contato para atendimento".

Use APENAS CTAs premium como: "Entender o problema muda a forma de enfrentar ele.", "Conhecimento reduz inseguranca.", "Clareza no diagnostico muda tudo.", "Seguranca comeca antes do procedimento."

Distribuicao de formatos variada: post, carrossel, story, reels. Nao repetir o mesmo formato em dias consecutivos.

Responda SOMENTE com JSON valido:
{
  "plan": [
    {
      "day": 1,
      "format": "post|carrossel|story|reels",
      "pillar": "nome do pilar",
      "theme": "titulo do post",
      "emotional_angle": "angulo emocional em 1 frase",
      "caption_suggestion": "sugestao de legenda em 2-3 frases",
      "cta": "CTA premium",
      "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"]
    }
  ]
}

Gere TODOS os dias solicitados. Retorne SOMENTE o JSON.`;

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY") || "AQ.Ab8RN6JMYH_sh4QGUcgxPfnFLALzUpE0BAd7xjIQTegCq3wCJQ";
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Gemini API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { title, pillars, period_days, start_date, userId } = body;

    if (!pillars?.trim()) {
      return new Response(JSON.stringify({ error: "Pillars/topics are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const days = Math.min(Math.max(parseInt(period_days) || 30, 7), 60);
    const userMessage = `Crie um calendario editorial completo para ${days} dias, a partir do dia ${start_date || new Date().toISOString().split("T")[0]}.

Pilares e temas de conteudo:
${pillars}

Distribuicao sugerida: Posts ~40%, Carrosseis ~30%, Stories ~20%, Reels ~10%.

Gere exatamente ${days} itens no array "plan".`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: PLANNER_SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig: { temperature: 0.85, maxOutputTokens: 8192, responseMimeType: "application/json" },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Erro na API Gemini");
    }

    const data = await res.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    let planData: { plan: any[] };
    try { planData = JSON.parse(rawContent); }
    catch {
      const m = rawContent.match(/\{[\s\S]*\}/);
      if (m) planData = JSON.parse(m[0]);
      else throw new Error("Resposta invalida do agente");
    }

    if (!planData.plan || !Array.isArray(planData.plan)) throw new Error("Estrutura do plano invalida");

    const startDateObj = start_date ? new Date(start_date) : new Date();

    const { data: plan, error: planError } = await supabase.from("content_plans").insert({
      user_id: userId,
      title: title || `Plano ${days} dias — ${startDateObj.toLocaleDateString("pt-BR")}`,
      pillars: pillars.trim(),
      period_days: days,
      start_date: startDateObj.toISOString().split("T")[0],
      status: "ready",
    }).select().single();

    if (planError || !plan) throw new Error("Falha ao salvar o plano");

    const posts = planData.plan.map((item: any, idx: number) => {
      const postDate = new Date(startDateObj);
      postDate.setDate(postDate.getDate() + idx);
      return {
        plan_id: plan.id,
        user_id: userId,
        day_number: item.day || idx + 1,
        scheduled_date: postDate.toISOString().split("T")[0],
        format: item.format || "post",
        theme: item.theme || "",
        emotional_angle: item.emotional_angle || "",
        caption_suggestion: item.caption_suggestion || "",
        cta: item.cta || "",
        hashtags: Array.isArray(item.hashtags) ? item.hashtags : [],
        pillar: item.pillar || "",
        status: "pending",
      };
    });

    const { error: postsError } = await supabase.from("content_plan_posts").insert(posts);
    if (postsError) throw new Error("Falha ao salvar os posts do plano");

    return new Response(
      JSON.stringify({ plan_id: plan.id, period_days: days, posts_count: posts.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
