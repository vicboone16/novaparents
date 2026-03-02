import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Action = "check_handshake" | "check_app_access" | "get_my_clients";

function buildNovaTrackClient() {
  return createClient(
    Deno.env.get("NOVATRACK_URL")!,
    Deno.env.get("NOVATRACK_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = (await req.json()) as { action: Action };
    const nt = buildNovaTrackClient();

    // ─── Handshake: no auth required (runs before login) ───
    if (action === "check_handshake") {
      const { data, error } = await nt
        .from("app_handshake")
        .select("app_slug")
        .eq("id", 3)
        .single();

      if (error) return json({ error: "handshake_failed", detail: error.message }, 500);
      return json({ app_slug: data?.app_slug ?? null });
    }

    // ─── All other actions require user authentication ───
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing_auth" }, 401);

    const localSupa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await localSupa.auth.getUser();
    if (authErr || !user) return json({ error: "not_authenticated" }, 401);

    switch (action) {
      case "check_app_access": {
        const { data: hasAccess, error: rpcErr } = await nt.rpc("has_app_access", {
          _user_id: user.id,
          _app_slug: "behaviordecoded",
        });

        if (rpcErr || hasAccess !== true) {
          return json({ hasAccess: false, role: null });
        }

        const { data: accessRow } = await nt
          .from("user_app_access")
          .select("role")
          .eq("user_id", user.id)
          .eq("app_slug", "behaviordecoded")
          .maybeSingle();

        return json({ hasAccess: true, role: accessRow?.role ?? null });
      }

      case "get_my_clients": {
        const { data: visRows, error: visErr } = await nt
          .from("student_app_visibility")
          .select("student_id")
          .eq("app_slug", "behaviordecoded");

        if (visErr || !visRows?.length) return json({ clients: [] });

        const visibleIds = new Set(visRows.map((r: any) => r.student_id));

        const { data: accessRows, error: accessErr } = await nt
          .from("user_student_access")
          .select("client_id")
          .eq("user_id", user.id);

        if (accessErr || !accessRows?.length) return json({ clients: [] });

        const studentIds = accessRows
          .map((r: any) => r.client_id)
          .filter((id: string) => id && visibleIds.has(id));

        if (studentIds.length === 0) return json({ clients: [] });

        const { data: students } = await nt
          .from("students")
          .select("id, first_name, last_name")
          .in("id", studentIds);

        return json({ clients: students ?? [] });
      }

      default:
        return json({ error: "unknown_action" }, 400);
    }
  } catch (err) {
    console.error("[novatrack-proxy]", err);
    return json({ error: "internal_error" }, 500);
  }
});
