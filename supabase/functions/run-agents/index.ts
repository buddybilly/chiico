import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function callGemini(apiKey: string, systemPrompt: string, userMessage: string, temperature: number, maxTokens: number): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Erro na API Gemini");
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

async function generateImageWithImagen(apiKey: string, prompt: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: "1:1" },
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const b64 = data.predictions?.[0]?.bytesBase64Encoded;
    return b64 ? `data:image/png;base64,${b64}` : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY") || "AQ.Ab8RN6JMYH_sh4QGUcgxPfnFLALzUpE0BAd7xjIQTegCq3wCJQ";
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Gemini API key not configured on server" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { prompt, steps, userId } = body;

    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let agents: any[] = [];
    if (userId) {
      const { data } = await supabase
        .from("gpt_agents")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .in("role", ["theme", "caption", "image"])
        .order("role");
      agents = data || [];
    }

    const enabledSteps: string[] = steps || ["theme", "caption", "image"];
    const results: Record<string, { output: string; hashtags?: string[]; imageUrl?: string }> = {};
    let currentInput = prompt.trim();

    for (const step of enabledSteps) {
      const agent = agents.find((a: { role: string }) => a.role === step);
      const temperature = agent?.temperature ?? 0.8;
      let systemPrompt: string = agent?.system_prompt || "";

      if (!systemPrompt) {
        if (step === "theme") {
          systemPrompt = `Voce e um estrategista de conteudo para Instagram. Dado um assunto, crie um tema especifico e envolvente para um post. Responda SOMENTE com o tema em texto plano, sem JSON. Maximo 200 palavras.`;
        } else if (step === "caption") {
          systemPrompt = `Voce e um especialista em marketing digital. Crie legendas envolventes para Instagram em portugues brasileiro. Responda SOMENTE com JSON valido: {"caption": "...", "hashtags": ["#tag1", "#tag2"]}. Inclua 10-15 hashtags. Legenda maximo 2200 caracteres.`;
        } else if (step === "image") {
          systemPrompt = `Voce e um especialista em prompt engineering para geracao de imagens. Crie um prompt detalhado em ingles para gerar uma imagem profissional para Instagram. Responda SOMENTE com JSON: {"image_prompt": "...", "style": "..."}. Descreva composicao, iluminacao, cores e estilo.`;
        }
      }

      const userMessage = step === "theme"
        ? `Crie um tema de post sobre: ${currentInput}`
        : step === "caption"
        ? `Crie uma legenda para Instagram sobre: ${currentInput}`
        : `Crie um prompt de imagem para ilustrar: ${currentInput}`;

      const content = await callGemini(apiKey, systemPrompt, userMessage, temperature, step === "image" ? 500 : 1000);

      if (step === "theme") {
        results.theme = { output: content };
        currentInput = content;
      } else if (step === "caption") {
        let parsed: { caption?: string; hashtags?: string[] };
        try { parsed = JSON.parse(content); }
        catch {
          const m = content.match(/\{[\s\S]*\}/);
          parsed = m ? JSON.parse(m[0]) : { caption: content, hashtags: [] };
        }
        results.caption = { output: parsed.caption || content, hashtags: parsed.hashtags || [] };
        currentInput = parsed.caption || content;
      } else if (step === "image") {
        let parsed: { image_prompt?: string; style?: string };
        try { parsed = JSON.parse(content); }
        catch {
          const m = content.match(/\{[\s\S]*\}/);
          parsed = m ? JSON.parse(m[0]) : { image_prompt: content, style: "professional" };
        }
        const imagePrompt = parsed.image_prompt || content;
        const imageUrl = await generateImageWithImagen(apiKey, imagePrompt);
        results.image = { output: imagePrompt, imageUrl: imageUrl || "" };
      }
    }

    return new Response(
      JSON.stringify({ theme: results.theme || null, caption: results.caption || null, image: results.image || null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
