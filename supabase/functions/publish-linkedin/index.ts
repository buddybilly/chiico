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
      .select("linkedin_access_token, linkedin_org_id")
      .eq("user_id", userId).maybeSingle();

    if (!settings?.linkedin_access_token) {
      return new Response(JSON.stringify({ error: "LinkedIn credentials not configured. Go to Settings." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let author: string;
    if (settings.linkedin_org_id) {
      author = (settings.linkedin_org_id as string).startsWith("urn:li:")
        ? settings.linkedin_org_id
        : `urn:li:organization:${settings.linkedin_org_id}`;
    } else {
      const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${settings.linkedin_access_token}` },
      });
      if (!meRes.ok) return new Response(JSON.stringify({ error: "Failed to fetch LinkedIn user info" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const meData = await meRes.json();
      author = `urn:li:person:${meData.sub}`;
    }

    const caption = post.generated_caption
      ? `${post.generated_caption}\n\n${(post.hashtags || []).join(" ")}`
      : (post.hashtags || []).join(" ");

    let mediaAsset: string | null = null;
    if (post.image_url) {
      try {
        const registerRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
          method: "POST",
          headers: { "Authorization": `Bearer ${settings.linkedin_access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            registerUploadRequest: {
              recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
              owner: author,
              serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
            },
          }),
        });
        if (registerRes.ok) {
          const reg = await registerRes.json();
          const uploadUrl = reg.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
          const asset = reg.value?.asset;
          if (uploadUrl && asset) {
            const imgRes = await fetch(post.image_url);
            if (imgRes.ok) {
              const imgBuffer = await imgRes.arrayBuffer();
              const uploadRes = await fetch(uploadUrl, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${settings.linkedin_access_token}`, "Content-Type": "image/jpeg" },
                body: imgBuffer,
              });
              if (uploadRes.ok) mediaAsset = asset;
            }
          }
        }
      } catch { /* continue without image */ }
    }

    const shareContent: Record<string, unknown> = {
      shareCommentary: { text: caption.substring(0, 3000) },
      shareMediaCategory: mediaAsset ? "IMAGE" : "NONE",
    };
    if (mediaAsset) {
      shareContent.media = [{ status: "READY", description: { text: caption.substring(0, 200) }, media: mediaAsset, title: { text: "Post" } }];
    }

    const ugcRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${settings.linkedin_access_token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author,
        lifecycleState: "PUBLISHED",
        specificContent: { "com.linkedin.ugc.ShareContent": shareContent },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });

    if (!ugcRes.ok) {
      const err = await ugcRes.json();
      return new Response(JSON.stringify({ error: err.message || `LinkedIn error: ${ugcRes.status}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const postUrn = ugcRes.headers.get("x-restli-id") || "";
    const now = new Date().toISOString();
    const existing = post.published_platforms || {};
    await supabase.from("scheduled_posts").update({
      published_platforms: { ...existing, linkedin: { status: "published", post_id: postUrn, published_at: now } },
      updated_at: now,
    }).eq("id", postId);

    return new Response(JSON.stringify({ success: true, post_urn: postUrn, published_at: now }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
