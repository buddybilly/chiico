import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { prompt, tone, language } = await req.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY") || "AQ.Ab8RN6JMYH_sh4QGUcgxPfnFLALzUpE0BAd7xjIQTegCq3wCJQ";
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API key not configured on server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const toneInstruction = tone ? `O tom deve ser ${tone}.` : "";
    const langInstruction = language ? `Escreva em ${language}.` : "Escreva em portugues brasileiro.";

    const systemInstruction = `Voce e um especialista em marketing digital e redes sociais, focado em Instagram. Crie legendas envolventes que geram engajamento. ${toneInstruction} ${langInstruction} Responda SOMENTE com JSON valido no formato: {"caption": "...", "hashtags": ["#tag1", "#tag2", ...]}. Inclua entre 5 e 15 hashtags relevantes. A legenda deve ter no maximo 2200 caracteres.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [
            { role: "user", parts: [{ text: `Crie uma legenda para Instagram sobre: ${prompt.trim()}` }] },
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1000,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Erro na API Gemini");
    }

    const data = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = { caption: content, hashtags: [] };
      }
    }

    return new Response(
      JSON.stringify({
        caption: parsed.caption || "",
        hashtags: parsed.hashtags || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro interno do servidor";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
