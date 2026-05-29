import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { postId, userId } = await req.json();
    if (!postId || !userId) {
      return new Response(JSON.stringify({ error: "postId and userId are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: post } = await supabase.from("scheduled_posts").select("*").eq("id", postId).eq("user_id", userId).maybeSingle();
    if (!post) return new Response(JSON.stringify({ error: "Post not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: settings } = await supabase.from("user_settings")
      .select("google_business_access_token, google_business_location_id")
      .eq("user_id", userId).maybeSingle();

    if (!settings?.google_business_access_token || !settings?.google_business_location_id) {
      return new Response(JSON.stringify({ error: "Google Business credentials not configured. Go to Settings." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const locationId = (settings.google_business_location_id as string).startsWith("locations/")
      ? settings.google_business_location_id
      : `locations/${settings.google_business_location_id}`;

    const caption = post.generated_caption
      ? `${post.generated_caption}\n\n${(post.hashtags || []).join(" ")}`
      : (post.hashtags || []).join(" ");

    const postBody: Record<string, unknown> = {
      languageCode: "pt-BR",
      summary: caption.substring(0, 1500),
      callToAction: { actionType: "LEARN_MORE" },
    };
    if (post.image_url) postBody.media = [{ mediaFormat: "PHOTO", sourceUrl: post.image_url }];

    const gbRes = await fetch(`https://mybusiness.googleapis.com/v4/${locationId}/localPosts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${settings.google_business_access_token}` },
      body: JSON.stringify(postBody),
    });

    if (!gbRes.ok) {
      const err = await gbRes.json();
      return new Response(JSON.stringify({ error: err.error?.message || `Google Business error: ${gbRes.status}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gbData = await gbRes.json();
    const now = new Date().toISOString();
    const existing = post.published_platforms || {};
    await supabase.from("scheduled_posts").update({
      published_platforms: { ...existing, google_business: { status: "published", post_id: gbData.name, published_at: now } },
      updated_at: now,
    }).eq("id", postId);

    return new Response(JSON.stringify({ success: true, post_name: gbData.name, published_at: now }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
