import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { topic } = await req.json();
    if (!topic?.trim()) {
      return new Response(JSON.stringify({ error: "Topic is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY") || "AQ.Ab8RN6JMYH_sh4QGUcgxPfnFLALzUpE0BAd7xjIQTegCq3wCJQ";
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Gemini API key nao configurada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = `Voce e um pesquisador especializado em marketing digital e redes sociais para o mercado brasileiro.
Dado o topico abaixo, realize uma pesquisa rapida e objetiva retornando em JSON com esta estrutura exata:
{
  "summary": "resumo do contexto em 2-3 frases",
  "angles": ["angulo 1", "angulo 2", "angulo 3"],
  "trends": ["tendencia 1", "tendencia 2"],
  "suggested_prompts": [
    {"prompt": "texto do prompt pronto para usar", "type": "carrossel|story|reels"},
    {"prompt": "texto do prompt pronto para usar", "type": "carrossel|story|reels"},
    {"prompt": "texto do prompt pronto para usar", "type": "carrossel|story|reels"}
  ]
}

Topico: ${topic.trim()}

Responda APENAS com o JSON, sem texto extra.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7 },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Erro na API Gemini");

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Resposta invalida da API Gemini");

    return new Response(JSON.stringify(JSON.parse(jsonMatch[0])), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
