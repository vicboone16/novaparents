import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Nova Core client (service role — bypasses RLS) ──────

function buildNT() {
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

// ─── Auth helper: get email from local Supabase Auth ─────

async function getAuthUserEmail(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const localSupa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await localSupa.auth.getUser();
  if (error || !user?.email) return null;
  return user.email.toLowerCase().trim();
}

// ─── Nova Core user resolution: email → user_id ─────────

async function resolveNovaCoreUserId(
  nt: ReturnType<typeof buildNT>,
  email: string
): Promise<string | null> {
  // Primary: profiles table
  const { data: profile } = await nt
    .from("profiles")
    .select("user_id")
    .eq("email", email)
    .maybeSingle();

  if (profile?.user_id) return profile.user_id;

  // Fallback: user_app_access by email
  const { data: appAccess } = await nt
    .from("user_app_access")
    .select("user_id")
    .eq("email", email)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  return appAccess?.user_id ?? null;
}

// ─── Table access control config ─────────────────────────

interface TableConfig {
  userCol?: string;
  adminOps?: string[];
  readAll?: boolean;
  readFilter?: Record<string, unknown>;
  readOnly?: boolean;
}

const TABLE_CONFIG: Record<string, TableConfig> = {
  profiles:                   { userCol: "user_id" },
  user_roles:                 { userCol: "user_id", readOnly: true },
  user_streaks:               { userCol: "user_id" },
  notification_preferences:   { userCol: "user_id" },
  academy_modules:            { readAll: true, adminOps: ["insert", "update", "delete"] },
  academy_module_versions:    { readAll: true, adminOps: ["insert", "update", "delete"] },
  academy_paths:              { readAll: true, adminOps: ["insert", "update", "delete"] },
  academy_path_modules:       { readAll: true, adminOps: ["insert", "update", "delete"] },
  academy_module_assignments: { userCol: "coach_user_id", adminOps: ["insert"] },
  academy_module_rules:       { readAll: true, adminOps: ["insert", "update", "delete"] },
  academy_module_progress:    { userCol: "user_id" },
  behavior_lab_games:         { readAll: true, adminOps: ["insert", "update", "delete"] },
  behavior_lab_attempts:      { userCol: "user_id" },
  evidence_packets:           { userCol: "user_id", adminOps: ["update"] },
  coach_evidence_packets:     { userCol: "coach_user_id", adminOps: ["update"] },
  weekly_snapshots:           { userCol: "coach_user_id", readOnly: true },
  invite_codes:               { adminOps: ["select", "insert", "update", "delete"] },
  agency_invite_codes:        { adminOps: ["select", "insert", "update", "delete"] },
  user_agency_access:         { userCol: "user_id" },
  user_student_access:        { userCol: "user_id", readOnly: true },
  students:                   { readAll: true, readOnly: true },
  user_app_access:            { userCol: "user_id", readOnly: true },
};

// ─── Admin check ─────────────────────────────────────────

async function isAdmin(nt: ReturnType<typeof buildNT>, userId: string): Promise<boolean> {
  const { data } = await nt
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["super_admin", "agency_admin", "supervisor"]);
  return !!data && data.length > 0;
}

// ─── Generic CRUD handler ────────────────────────────────

interface CrudParams {
  table: string;
  operation: "select" | "insert" | "update" | "upsert" | "delete";
  filters?: Record<string, unknown>;
  eq_filters?: Array<{ col: string; val: unknown }>;
  in_filters?: Array<{ col: string; vals: unknown[] }>;
  data?: Record<string, unknown> | Record<string, unknown>[];
  order?: Array<{ col: string; ascending?: boolean }>;
  limit?: number;
  single?: boolean;
  maybe_single?: boolean;
  on_conflict?: string;
  select_columns?: string;
}

async function handleCrud(
  nt: ReturnType<typeof buildNT>,
  userId: string,
  params: CrudParams
): Promise<Response> {
  const { table, operation } = params;
  const config = TABLE_CONFIG[table];
  if (!config) return json({ error: `table_not_allowed: ${table}` }, 403);

  if (config.readOnly && operation !== "select") {
    return json({ error: `table_read_only: ${table}` }, 403);
  }

  if (config.adminOps?.includes(operation)) {
    const admin = await isAdmin(nt, userId);
    if (!admin) return json({ error: "admin_required" }, 403);
  }

  const selectCols = params.select_columns || "*";

  try {
    if (operation === "select") {
      let query = nt.from(table).select(selectCols);

      if (config.userCol && !config.readAll) {
        const admin = await isAdmin(nt, userId);
        if (!admin) query = query.eq(config.userCol, userId);
      }

      if (params.eq_filters) {
        for (const f of params.eq_filters) query = query.eq(f.col, f.val);
      }
      if (params.in_filters) {
        for (const f of params.in_filters) query = query.in(f.col, f.vals);
      }
      if (params.order) {
        for (const o of params.order) query = query.order(o.col, { ascending: o.ascending ?? true });
      }
      if (params.limit) query = query.limit(params.limit);

      if (params.single) {
        const { data, error } = await query.single();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }
      if (params.maybe_single) {
        const { data, error } = await query.maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

      const { data, error } = await query;
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    if (operation === "insert") {
      let rowData = params.data;
      if (config.userCol && rowData && !Array.isArray(rowData)) {
        if (!(config.userCol in rowData)) {
          rowData = { ...rowData, [config.userCol]: userId };
        }
      }
      if (config.userCol && Array.isArray(rowData)) {
        rowData = rowData.map(r =>
          config.userCol! in r ? r : { ...r, [config.userCol!]: userId }
        );
      }

      const query = nt.from(table).insert(rowData as any).select(selectCols);
      if (params.single || params.maybe_single) {
        const { data, error } = await query.single();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }
      const { data, error } = await query;
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    if (operation === "update") {
      let query = nt.from(table).update(params.data as any);

      if (config.userCol) {
        const admin = await isAdmin(nt, userId);
        if (!admin) query = query.eq(config.userCol, userId);
      }

      if (params.eq_filters) {
        for (const f of params.eq_filters) query = query.eq(f.col, f.val);
      }

      const { data, error } = await query.select(selectCols);
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    if (operation === "upsert") {
      let rowData = params.data;
      if (config.userCol && rowData && !Array.isArray(rowData)) {
        if (!(config.userCol in rowData)) {
          rowData = { ...rowData, [config.userCol]: userId };
        }
      }

      let query = nt.from(table).upsert(rowData as any, {
        onConflict: params.on_conflict,
      });

      const { data, error } = await query.select(selectCols);
      if (error) return json({ error: error.message }, 400);
      return json({ data: params.single ? data?.[0] : data });
    }

    if (operation === "delete") {
      let query = nt.from(table).delete();

      if (config.userCol) {
        const admin = await isAdmin(nt, userId);
        if (!admin) query = query.eq(config.userCol, userId);
      }

      if (params.eq_filters) {
        for (const f of params.eq_filters) query = query.eq(f.col, f.val);
      }

      const { error } = await query;
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    return json({ error: "unknown_operation" }, 400);
  } catch (err: any) {
    console.error(`[proxy] CRUD error on ${table}.${operation}:`, err);
    return json({ error: err.message || "crud_failed" }, 500);
  }
}

// ─── RPC handler ─────────────────────────────────────────

const ALLOWED_RPCS = new Set([
  "redeem_invite_code",
  "redeem_agency_invite_code",
  "has_role",
  "has_app_access",
]);

async function handleRpc(
  nt: ReturnType<typeof buildNT>,
  _userId: string,
  rpcName: string,
  rpcParams: Record<string, unknown>
): Promise<Response> {
  if (!ALLOWED_RPCS.has(rpcName)) {
    return json({ error: `rpc_not_allowed: ${rpcName}` }, 403);
  }

  const { data, error } = await nt.rpc(rpcName, rpcParams);
  if (error) return json({ error: error.message }, 400);
  return json({ data });
}

// ─── Main handler ────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;
    const nt = buildNT();

    // ─── Handshake: no auth required ───
    if (action === "check_handshake") {
      const { data, error } = await nt
        .from("app_handshake")
        .select("app_slug")
        .eq("id", 3)
        .single();

      if (error) return json({ error: "handshake_failed", detail: error.message }, 500);
      return json({ app_slug: data?.app_slug ?? null });
    }

    // ─── All other actions require authentication ───
    const email = await getAuthUserEmail(req);
    if (!email) return json({ error: "not_authenticated" }, 401);

    // Resolve Nova Core user_id from email
    const novaCoreUserId = await resolveNovaCoreUserId(nt, email);
    if (!novaCoreUserId) {
      return json({ error: "user_not_provisioned", detail: "No Nova Core profile found for this email" }, 403);
    }

    switch (action) {
      case "check_app_access": {
        // Query user_app_access by resolved user_id
        const { data: accessRows, error: accessErr } = await nt
          .from("user_app_access")
          .select("role, agency_id, is_active")
          .eq("user_id", novaCoreUserId)
          .eq("app_slug", "behavior_decoded")
          .eq("is_active", true);

        if (accessErr || !accessRows?.length) {
          // Fallback: check if super_admin or agency owner (they get implicit access)
          const admin = await isAdmin(nt, novaCoreUserId);
          if (admin) {
            const { data: roleRow } = await nt
              .from("user_roles")
              .select("role")
              .eq("user_id", novaCoreUserId)
              .limit(1)
              .maybeSingle();
            return json({ hasAccess: true, role: roleRow?.role ?? "admin" });
          }
          return json({ hasAccess: false, role: null });
        }

        // Return first matching access row's role
        return json({
          hasAccess: true,
          role: accessRows[0]?.role ?? null,
        });
      }

      case "get_my_clients": {
        const { data: accessRows, error: accessErr } = await nt
          .from("user_student_access")
          .select("student_id")
          .eq("user_id", novaCoreUserId)
          .eq("app_scope", "behavior_decoded");

        if (accessErr || !accessRows?.length) return json({ clients: [] });

        const studentIds = accessRows.map((r: any) => r.student_id).filter(Boolean);
        if (studentIds.length === 0) return json({ clients: [] });

        const { data: students } = await nt
          .from("students")
          .select("id, first_name, last_name")
          .in("id", studentIds);

        return json({ clients: students ?? [] });
      }

      case "query": {
        const params = body.params as CrudParams;
        if (!params?.table || !params?.operation) {
          return json({ error: "missing table or operation" }, 400);
        }
        return handleCrud(nt, novaCoreUserId, params);
      }

      case "rpc": {
        const { rpc_name, rpc_params } = body;
        if (!rpc_name) return json({ error: "missing rpc_name" }, 400);
        return handleRpc(nt, novaCoreUserId, rpc_name, rpc_params || {});
      }

      default:
        return json({ error: "unknown_action" }, 400);
    }
  } catch (err) {
    console.error("[novatrack-proxy]", err);
    return json({ error: "internal_error" }, 500);
  }
});
