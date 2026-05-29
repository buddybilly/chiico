import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function publishInstagram(
  supabase: ReturnType<typeof createClient>,
  post: Record<string, unknown>,
  settings: { instagram_access_token: string; instagram_account_id: string },
  now: string
): Promise<{ success: boolean; error?: string }> {
  if (!settings.instagram_access_token || !settings.instagram_account_id || !post.image_url) {
    return { success: false, error: "Missing Instagram credentials or image" };
  }

  const caption = post.generated_caption
    ? `${post.generated_caption}\n\n${(post.hashtags as string[] || []).join(" ")}`
    : (post.hashtags as string[] || []).join(" ");

  const postType = (post.post_type as string) || "carousel";
  const containerBody: Record<string, unknown> = {
    caption: caption.substring(0, 2200),
    access_token: settings.instagram_access_token,
  };

  if (postType === "story") {
    containerBody.image_url = post.image_url;
    containerBody.media_type = "IMAGE";
    containerBody.is_story = true;
  } else {
    containerBody.image_url = post.image_url;
    containerBody.media_type = "IMAGE";
  }

  const containerRes = await fetch(
    `https://graph.facebook.com/v21.0/${settings.instagram_account_id}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(containerBody),
    }
  );

  if (!containerRes.ok) {
    const err = await containerRes.json();
    return { success: false, error: err.error?.message || "Container creation failed" };
  }

  const { id: containerId } = await containerRes.json();

  let attempts = 0;
  let ready = false;
  while (attempts < 20 && !ready) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(
      `https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${settings.instagram_access_token}`
    );
    const statusData = await statusRes.json();
    if (statusData.status_code === "FINISHED") ready = true;
    else if (statusData.status_code === "ERROR") return { success: false, error: "Instagram media processing failed" };
    attempts++;
  }

  if (!ready) return { success: false, error: "Media processing timed out" };

  const publishRes = await fetch(
    `https://graph.facebook.com/v21.0/${settings.instagram_account_id}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: containerId, access_token: settings.instagram_access_token }),
    }
  );

  if (!publishRes.ok) {
    const err = await publishRes.json();
    return { success: false, error: err.error?.message || "Publishing failed" };
  }

  const published = await publishRes.json();

  const existingPlatforms = (post.published_platforms as Record<string, unknown>) || {};
  await supabase.from("scheduled_posts").update({
    status: "published",
    published_at: now,
    instagram_post_id: published.id || "",
    published_platforms: { ...existingPlatforms, instagram: { status: "published", post_id: published.id, published_at: now } },
    updated_at: now,
  }).eq("id", post.id);

  return { success: true };
}

async function publishGoogleBusiness(
  supabase: ReturnType<typeof createClient>,
  post: Record<string, unknown>,
  settings: { google_business_access_token: string; google_business_location_id: string },
  now: string
): Promise<{ success: boolean; error?: string }> {
  const locationId = (settings.google_business_location_id as string).startsWith("locations/")
    ? settings.google_business_location_id
    : `locations/${settings.google_business_location_id}`;

  const caption = post.generated_caption
    ? `${post.generated_caption}\n\n${(post.hashtags as string[] || []).join(" ")}`
    : (post.hashtags as string[] || []).join(" ");

  const postBody: Record<string, unknown> = {
    languageCode: "pt-BR",
    summary: (caption as string).substring(0, 1500),
    callToAction: { actionType: "LEARN_MORE" },
  };

  if (post.image_url) {
    postBody.media = [{ mediaFormat: "PHOTO", sourceUrl: post.image_url }];
  }

  const gbRes = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationId}/localPosts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.google_business_access_token}`,
      },
      body: JSON.stringify(postBody),
    }
  );

  if (!gbRes.ok) {
    const err = await gbRes.json();
    return { success: false, error: err.error?.message || `Google Business error: ${gbRes.status}` };
  }

  const gbData = await gbRes.json();
  const existingPlatforms = (post.published_platforms as Record<string, unknown>) || {};
  await supabase.from("scheduled_posts").update({
    published_platforms: { ...existingPlatforms, google_business: { status: "published", post_id: gbData.name, published_at: now } },
    updated_at: now,
  }).eq("id", post.id);

  return { success: true };
}

async function publishLinkedIn(
  supabase: ReturnType<typeof createClient>,
  post: Record<string, unknown>,
  settings: { linkedin_access_token: string; linkedin_org_id?: string },
  now: string
): Promise<{ success: boolean; error?: string }> {
  let author: string;
  if (settings.linkedin_org_id) {
    author = (settings.linkedin_org_id as string).startsWith("urn:li:")
      ? settings.linkedin_org_id
      : `urn:li:organization:${settings.linkedin_org_id}`;
  } else {
    const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${settings.linkedin_access_token}` },
    });
    if (!meRes.ok) return { success: false, error: "Failed to fetch LinkedIn user info" };
    const meData = await meRes.json();
    author = `urn:li:person:${meData.sub}`;
  }

  const caption = post.generated_caption
    ? `${post.generated_caption}\n\n${(post.hashtags as string[] || []).join(" ")}`
    : (post.hashtags as string[] || []).join(" ");

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
          const imgRes = await fetch(post.image_url as string);
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
    shareCommentary: { text: (caption as string).substring(0, 3000) },
    shareMediaCategory: mediaAsset ? "IMAGE" : "NONE",
  };
  if (mediaAsset) {
    shareContent.media = [{ status: "READY", description: { text: (caption as string).substring(0, 200) }, media: mediaAsset, title: { text: "Post" } }];
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
    return { success: false, error: err.message || `LinkedIn error: ${ugcRes.status}` };
  }

  const postUrn = ugcRes.headers.get("x-restli-id") || "";
  const existingPlatforms = (post.published_platforms as Record<string, unknown>) || {};
  await supabase.from("scheduled_posts").update({
    published_platforms: { ...existingPlatforms, linkedin: { status: "published", post_id: postUrn, published_at: now } },
    updated_at: now,
  }).eq("id", post.id);

  return { success: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const now = new Date().toISOString();

    const { data: posts, error: fetchError } = await supabase
      .from("scheduled_posts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now);

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ message: "No posts to publish", published: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { id: string; platforms: Record<string, { success: boolean; error?: string }> }[] = [];

    for (const post of posts) {
      const platforms = (post.platforms as string[]) || ["instagram"];
      const platformResults: Record<string, { success: boolean; error?: string }> = {};

      const { data: settings } = await supabase
        .from("user_settings")
        .select("instagram_access_token, instagram_account_id, google_business_access_token, google_business_location_id, linkedin_access_token, linkedin_org_id")
        .eq("user_id", post.user_id)
        .maybeSingle();

      if (!settings) {
        await supabase.from("scheduled_posts").update({ status: "failed", updated_at: now }).eq("id", post.id);
        results.push({ id: post.id, platforms: { error: { success: false, error: "No settings found" } } });
        continue;
      }

      // Publish to each selected platform in parallel
      const publishTasks = platforms.map(async (platform: string) => {
        if (platform === "instagram" && settings.instagram_access_token) {
          platformResults.instagram = await publishInstagram(supabase, post, settings, now);
        } else if (platform === "google_business" && settings.google_business_access_token) {
          platformResults.google_business = await publishGoogleBusiness(supabase, post, settings, now);
        } else if (platform === "linkedin" && settings.linkedin_access_token) {
          platformResults.linkedin = await publishLinkedIn(supabase, post, settings, now);
        } else {
          platformResults[platform] = { success: false, error: "Credentials not configured" };
        }
      });

      await Promise.allSettled(publishTasks);

      const anySuccess = Object.values(platformResults).some(r => r.success);
      const allFailed = Object.values(platformResults).every(r => !r.success);

      if (anySuccess) {
        await supabase.from("scheduled_posts").update({
          status: allFailed ? "failed" : "published",
          published_at: allFailed ? null : now,
          updated_at: now,
        }).eq("id", post.id);
      } else {
        await supabase.from("scheduled_posts").update({ status: "failed", updated_at: now }).eq("id", post.id);
      }

      results.push({ id: post.id, platforms: platformResults });
    }

    const totalPublished = results.filter(r => Object.values(r.platforms).some(p => p.success)).length;

    return new Response(
      JSON.stringify({ message: `Processed ${posts.length} posts`, published: totalPublished, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
