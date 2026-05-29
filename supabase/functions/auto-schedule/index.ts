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
    const body = await req.json();
    const { action, userId, slotId, slot, date } = body;

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "get_slots") {
      const { data: slots } = await supabase.from("auto_schedule_slots").select("*").eq("user_id", userId).order("time");

      if (!slots || slots.length === 0) {
        const defaults = [
          { user_id: userId, time: "08:00", post_type: "story", is_active: true },
          { user_id: userId, time: "10:00", post_type: "carousel", is_active: true },
          { user_id: userId, time: "14:00", post_type: "story", is_active: true },
          { user_id: userId, time: "16:00", post_type: "carousel", is_active: true },
          { user_id: userId, time: "20:00", post_type: "story", is_active: true },
        ];
        const { data: created } = await supabase.from("auto_schedule_slots").insert(defaults).select();
        return new Response(JSON.stringify({ slots: created || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ slots }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update_slot" && slotId) {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (slot?.time !== undefined) updates.time = slot.time;
      if (slot?.post_type !== undefined) updates.post_type = slot.post_type;
      if (slot?.is_active !== undefined) updates.is_active = slot.is_active;
      const { data, error } = await supabase.from("auto_schedule_slots").update(updates).eq("id", slotId).eq("user_id", userId).select().maybeSingle();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ slot: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "add_slot" && slot) {
      const { data, error } = await supabase.from("auto_schedule_slots").insert({ user_id: userId, time: slot.time, post_type: slot.post_type, is_active: slot.is_active ?? true }).select().maybeSingle();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ slot: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete_slot" && slotId) {
      await supabase.from("auto_schedule_slots").delete().eq("id", slotId).eq("user_id", userId);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "compute_slots" && date) {
      const { data: slots } = await supabase.from("auto_schedule_slots").select("*").eq("user_id", userId).eq("is_active", true).order("time");
      const computedSlots = (slots || []).map((s: { time: string; post_type: string }) => ({
        datetime: `${date}T${s.time}:00`,
        time: s.time,
        post_type: s.post_type,
      }));
      return new Response(JSON.stringify({ slots: computedSlots }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
