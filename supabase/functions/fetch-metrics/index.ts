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
    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: posts } = await supabase
      .from("scheduled_posts")
      .select("id, instagram_post_id")
      .eq("user_id", userId)
      .eq("status", "published")
      .not("instagram_post_id", "is", null)
      .neq("instagram_post_id", "");

    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ message: "No published posts", updated: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: settings } = await supabase.from("user_settings").select("instagram_access_token").eq("user_id", userId).maybeSingle();

    if (!settings?.instagram_access_token) {
      return new Response(JSON.stringify({ error: "Instagram access token not configured" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const alerts500: { postId: string; views: number }[] = [];
    let updated = 0;

    for (const post of posts) {
      try {
        const insightsRes = await fetch(
          `https://graph.facebook.com/v19.0/${post.instagram_post_id}/insights?metric=impressions,likes,comments&access_token=${settings.instagram_access_token}`
        );
        if (!insightsRes.ok) continue;

        const insightsData = await insightsRes.json();
        let views = 0, likes = 0, comments = 0;
        for (const metric of insightsData.data || []) {
          if (metric.name === "impressions") views = metric.values?.[0]?.value || 0;
          if (metric.name === "likes") likes = metric.values?.[0]?.value || 0;
          if (metric.name === "comments") comments = metric.values?.[0]?.value || 0;
        }

        const reached500 = views >= 500;
        const { data: existing } = await supabase.from("post_metrics").select("id, reached_500").eq("post_id", post.id).maybeSingle();

        if (existing) {
          const isNew500 = reached500 && !existing.reached_500;
          await supabase.from("post_metrics").update({ views, likes, comments, reached_500, fetched_at: new Date().toISOString() }).eq("id", existing.id);
          if (isNew500) alerts500.push({ postId: post.id, views });
        } else {
          await supabase.from("post_metrics").insert({ post_id: post.id, views, likes, comments, reached_500, fetched_at: new Date().toISOString() });
          if (reached500) alerts500.push({ postId: post.id, views });
        }
        updated++;
      } catch { continue; }
    }

    return new Response(JSON.stringify({ message: `Updated ${updated} posts`, updated, alerts_500: alerts500 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
