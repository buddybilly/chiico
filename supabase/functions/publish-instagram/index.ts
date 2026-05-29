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
    if (!post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await supabase.from("user_settings")
      .select("instagram_access_token, instagram_account_id")
      .eq("user_id", userId).maybeSingle();

    if (!settings?.instagram_access_token || !settings?.instagram_account_id) {
      return new Response(JSON.stringify({ error: "Instagram credentials not configured. Go to Settings." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!post.image_url) {
      return new Response(JSON.stringify({ error: "Post must have an image to publish on Instagram" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const caption = post.generated_caption
      ? `${post.generated_caption}\n\n${(post.hashtags || []).join(" ")}`
      : (post.hashtags || []).join(" ");

    const postType = post.post_type || "carousel";
    const containerBody: Record<string, unknown> = {
      caption: caption.substring(0, 2200),
      access_token: settings.instagram_access_token,
      image_url: post.image_url,
      media_type: "IMAGE",
    };
    if (postType === "story") containerBody.is_story = true;

    const containerRes = await fetch(
      `https://graph.facebook.com/v21.0/${settings.instagram_account_id}/media`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(containerBody) }
    );

    if (!containerRes.ok) {
      const err = await containerRes.json();
      return new Response(JSON.stringify({ error: err.error?.message || "Failed to create Instagram media container" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { id: containerId } = await containerRes.json();

    let attempts = 0, ready = false;
    while (attempts < 20 && !ready) {
      await new Promise((r) => setTimeout(r, 3000));
      const statusRes = await fetch(`https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${settings.instagram_access_token}`);
      const statusData = await statusRes.json();
      if (statusData.status_code === "FINISHED") ready = true;
      else if (statusData.status_code === "ERROR") {
        return new Response(JSON.stringify({ error: "Instagram media processing failed" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      attempts++;
    }

    if (!ready) {
      return new Response(JSON.stringify({ error: "Instagram media processing timed out" }), {
        status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const publishRes = await fetch(
      `https://graph.facebook.com/v21.0/${settings.instagram_account_id}/media_publish`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creation_id: containerId, access_token: settings.instagram_access_token }) }
    );

    if (!publishRes.ok) {
      const err = await publishRes.json();
      return new Response(JSON.stringify({ error: err.error?.message || "Failed to publish on Instagram" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const published = await publishRes.json();
    const now = new Date().toISOString();

    await supabase.from("scheduled_posts").update({
      status: "published",
      published_at: now,
      instagram_post_id: published.id || "",
      updated_at: now,
    }).eq("id", postId);

    return new Response(
      JSON.stringify({ success: true, instagram_post_id: published.id, published_at: now }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
