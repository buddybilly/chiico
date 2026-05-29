import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FB_APP_ID = "848251645022190";
const FB_APP_SECRET = Deno.env.get("FB_APP_SECRET") || "rvOFXa-1duqMGfmkpzMFrX26sF8";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Exchange short-lived token for long-lived token (called from frontend after popup)
    if (req.method === "POST" && action === "exchange") {
      const { short_token, user_id } = await req.json();

      if (!short_token || !user_id) {
        return new Response(JSON.stringify({ error: "Missing short_token or user_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await exchangeAndSave(short_token, user_id);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle OAuth redirect callback (GET from Facebook)
    if (req.method === "GET" && action === "callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state"); // contains user_id:app_url
      const errorParam = url.searchParams.get("error");

      if (errorParam) {
        const appUrl = extractAppUrl(state);
        return redirectToApp(appUrl, { error: errorParam });
      }

      if (!code || !state) {
        const appUrl = extractAppUrl(state);
        return redirectToApp(appUrl, { error: "missing_code" });
      }

      const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/facebook-oauth?action=callback`;

      // Exchange code for short-lived token
      const tokenRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
      );
      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        const appUrl = extractAppUrl(state);
        return redirectToApp(appUrl, { error: tokenData.error.message });
      }

      // Parse state: "userId|appUrl"
      const parts = state.split("|");
      const userId = parts[0];
      const appUrl = parts.slice(1).join("|") || "https://cettkysgwetrbrhmusuc.supabase.co";

      const result = await exchangeAndSave(tokenData.access_token, userId);

      if (result.success) {
        return redirectToApp(appUrl, {
          oauth_success: "1",
          ig_token: result.token || "",
          ig_account_id: result.instagram_account_id || "",
          ig_username: result.instagram_username || "",
          user_id: userId,
        });
      } else {
        return redirectToApp(appUrl, { error: result.error || "exchange_failed" });
      }
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function extractAppUrl(state: string | null): string {
  if (!state) return "https://cettkysgwetrbrhmusuc.supabase.co";
  const parts = state.split("|");
  return parts.slice(1).join("|") || "https://cettkysgwetrbrhmusuc.supabase.co";
}

function redirectToApp(appUrl: string, params: Record<string, string>): Response {
  const redirectUrl = new URL(appUrl);
  for (const [k, v] of Object.entries(params)) {
    redirectUrl.searchParams.set(k, v);
  }
  return new Response(null, {
    status: 302,
    headers: { Location: redirectUrl.toString() },
  });
}

async function exchangeAndSave(shortToken: string, userId: string): Promise<Record<string, unknown>> {
  // Exchange for long-lived token
  const exchangeRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&fb_exchange_token=${shortToken}`
  );
  const exchangeData = await exchangeRes.json();

  if (exchangeData.error) {
    return { success: false, error: exchangeData.error.message };
  }

  const longToken = exchangeData.access_token;

  // Get Facebook Pages with Instagram accounts
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${longToken}`
  );
  const pagesData = await pagesRes.json();

  let igAccountId: string | null = null;
  let igUsername: string | null = null;
  let igPageToken: string | null = null;

  if (!pagesData.error) {
    const pages = pagesData.data || [];
    for (const page of pages) {
      if (page.instagram_business_account) {
        igAccountId = page.instagram_business_account.id;
        igPageToken = page.access_token;

        const igRes = await fetch(
          `https://graph.facebook.com/v21.0/${igAccountId}?fields=id,name,username&access_token=${igPageToken}`
        );
        const igData = await igRes.json();
        if (!igData.error) {
          igUsername = igData.username || igData.name;
        }
        break;
      }
    }
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const updatePayload: Record<string, string> = {
    instagram_access_token: igPageToken || longToken,
    updated_at: new Date().toISOString(),
  };
  if (igAccountId) updatePayload.instagram_account_id = igAccountId;
  if (igUsername) updatePayload.instagram_username = igUsername;

  const { data: existing } = await supabase
    .from("user_settings")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase.from("user_settings").update(updatePayload).eq("user_id", userId);
  } else {
    await supabase.from("user_settings").insert({ ...updatePayload, user_id: userId });
  }

  return {
    success: true,
    token: igPageToken || longToken,
    instagram_account_id: igAccountId,
    instagram_username: igUsername,
  };
}
