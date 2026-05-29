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

    // Exchange short-lived token for long-lived token and fetch IG account
    if (req.method === "POST" && action === "exchange") {
      const { short_token, user_id } = await req.json();

      if (!short_token || !user_id) {
        return new Response(JSON.stringify({ error: "Missing short_token or user_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Exchange for long-lived token
      const exchangeRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&fb_exchange_token=${short_token}`
      );
      const exchangeData = await exchangeRes.json();

      if (exchangeData.error) {
        return new Response(JSON.stringify({ error: exchangeData.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const longToken = exchangeData.access_token;

      // Get Facebook Pages
      const pagesRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${longToken}`
      );
      const pagesData = await pagesRes.json();

      if (pagesData.error) {
        return new Response(JSON.stringify({ error: pagesData.error.message, token: longToken, pages: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const pages = (pagesData.data || []).map((p: Record<string, unknown>) => ({
        id: p.id,
        name: p.name,
        page_token: p.access_token,
        instagram_business_account: p.instagram_business_account,
      }));

      // Try to find Instagram account from first page with IG connected
      let igAccountId = null;
      let igUsername = null;
      let igPageToken = null;

      for (const page of pages) {
        if (page.instagram_business_account) {
          igAccountId = (page.instagram_business_account as Record<string, string>).id;
          igPageToken = page.page_token;

          // Fetch IG username
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

      // Save to Supabase
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
        .eq("user_id", user_id)
        .maybeSingle();

      if (existing) {
        await supabase.from("user_settings").update(updatePayload).eq("user_id", user_id);
      } else {
        await supabase.from("user_settings").insert({ ...updatePayload, user_id });
      }

      return new Response(
        JSON.stringify({
          success: true,
          token: igPageToken || longToken,
          instagram_account_id: igAccountId,
          instagram_username: igUsername,
          pages,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle OAuth redirect callback
    if (req.method === "GET" && action === "callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state"); // contains user_id
      const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/facebook-oauth?action=callback`;

      if (!code) {
        return new Response("<html><body><script>window.close();</script><p>Erro: codigo nao encontrado.</p></body></html>", {
          status: 400,
          headers: { "Content-Type": "text/html" },
        });
      }

      // Exchange code for token
      const tokenRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
      );
      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        return new Response(
          `<html><body><script>window.opener && window.opener.postMessage({type:'FB_OAUTH_ERROR',error:'${tokenData.error.message}'},'*');window.close();</script><p>Erro: ${tokenData.error.message}</p></body></html>`,
          { status: 200, headers: { "Content-Type": "text/html" } }
        );
      }

      const shortToken = tokenData.access_token;

      return new Response(
        `<html><body><script>
          window.opener && window.opener.postMessage({
            type: 'FB_OAUTH_SUCCESS',
            token: '${shortToken}',
            state: '${state || ''}'
          }, '*');
          window.close();
        </script><p>Autenticado! Pode fechar esta janela.</p></body></html>`,
        { status: 200, headers: { "Content-Type": "text/html" } }
      );
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
