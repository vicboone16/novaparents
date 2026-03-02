import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Allowed actions this proxy can perform against the NovaTrack backend. */
type Action =
  | "check_handshake"
  | "check_app_access"
  | "get_my_clients";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authenticate the caller via the LOCAL Supabase project ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "missing_auth" }, 401);
    }

    const localUrl = Deno.env.get("SUPABASE_URL")!;
    const localKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const localSupa = createClient(localUrl, localKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authErr,
    } = await localSupa.auth.getUser();
    if (authErr || !user) {
      return json({ error: "not_authenticated" }, 401);
    }

    // --- Parse the requested action ---
    const { action, params } = (await req.json()) as {
      action: Action;
      params?: Record<string, unknown>;
    };

    // --- Build a SERVICE-ROLE client for the NovaTrack backend ---
    const ntUrl = Deno.env.get("NOVATRACK_URL")!;
    const ntKey = Deno.env.get("NOVATRACK_SERVICE_ROLE_KEY")!;
    const nt = createClient(ntUrl, ntKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    switch (action) {
      // ─── Handshake ────────────────────────────────────
      case "check_handshake": {
        const { data, error } = await nt
          .from("app_handshake")
          .select("app_slug")
          .eq("id", 3)
          .single();

        if (error) return json({ error: "handshake_failed", detail: error.message }, 500);
        return json({ app_slug: data?.app_slug ?? null });
      }

      // ─── App access gating ────────────────────────────
      case "check_app_access": {
        const { data: hasAccess, error: rpcErr } = await nt.rpc(
          "has_app_access",
          { _user_id: user.id, _app_slug: "behaviordecoded" }
        );

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

      // ─── Students (my clients) ────────────────────────
      case "get_my_clients": {
        // 1. visible student IDs for this app
        const { data: visRows, error: visErr } = await nt
          .from("student_app_visibility")
          .select("student_id")
          .eq("app_slug", "behaviordecoded");

        if (visErr || !visRows?.length) {
          return json({ clients: [] });
        }

        const visibleIds = new Set(visRows.map((r: any) => r.student_id));

        // 2. student IDs the user can access
        const { data: accessRows, error: accessErr } = await nt
          .from("user_student_access")
          .select("client_id")
          .eq("user_id", user.id);

        if (accessErr || !accessRows?.length) {
          return json({ clients: [] });
        }

        const studentIds = accessRows
          .map((r: any) => r.client_id)
          .filter((id: string) => id && visibleIds.has(id));

        if (studentIds.length === 0) return json({ clients: [] });

        // 3. fetch student details
        const { data: students, error: studentsErr } = await nt
          .from("students")
          .select("id, first_name, last_name")
          .in("id", studentIds);

        if (studentsErr) return json({ clients: [] });

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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
