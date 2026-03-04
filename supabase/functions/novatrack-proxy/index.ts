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

// ─── Auth helper ─────────────────────────────────────────

async function getAuthUser(req: Request): Promise<{ id: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const localSupa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await localSupa.auth.getUser();
  if (error || !user) return null;
  return { id: user.id };
}

// ─── Table access control config ─────────────────────────
// userCol: column that must match auth.uid() for non-admin access
// adminOps: operations that require admin role
// readAll: if true, SELECT doesn't require user scoping (e.g. active modules)
// readFilter: additional filter applied on SELECT for non-admins

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

// ─── Admin check (cached per request) ────────────────────

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

  // Check read-only
  if (config.readOnly && operation !== "select") {
    return json({ error: `table_read_only: ${table}` }, 403);
  }

  // Check admin requirement
  if (config.adminOps?.includes(operation)) {
    const admin = await isAdmin(nt, userId);
    if (!admin) return json({ error: "admin_required" }, 403);
  }

  const selectCols = params.select_columns || "*";

  try {
    if (operation === "select") {
      let query = nt.from(table).select(selectCols);

      // User scoping for non-admin reads
      if (config.userCol && !config.readAll) {
        const admin = await isAdmin(nt, userId);
        if (!admin) {
          query = query.eq(config.userCol, userId);
        }
      }

      // Apply filters
      if (params.eq_filters) {
        for (const f of params.eq_filters) query = query.eq(f.col, f.val);
      }
      if (params.in_filters) {
        for (const f of params.in_filters) query = query.in(f.col, f.vals);
      }

      // Order
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
      // Inject user_id if table has userCol and data doesn't include it
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

      // User scoping for non-admin updates
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
  userId: string,
  rpcName: string,
  rpcParams: Record<string, unknown>
): Promise<Response> {
  if (!ALLOWED_RPCS.has(rpcName)) {
    return json({ error: `rpc_not_allowed: ${rpcName}` }, 403);
  }

  // For RPCs that need the calling user's context, we need to set it
  // Since we use service role, we pass user_id explicitly where needed
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
    const user = await getAuthUser(req);
    if (!user) return json({ error: "not_authenticated" }, 401);

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
          .eq("app_slug", "behavior_decoded")
          .maybeSingle();

        return json({ hasAccess: true, role: accessRow?.role ?? null });
      }

      case "get_my_clients": {
        // Use user_student_access with app_scope
        const { data: accessRows, error: accessErr } = await nt
          .from("user_student_access")
          .select("student_id")
          .eq("user_id", user.id)
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
        return handleCrud(nt, user.id, params);
      }

      case "rpc": {
        const { rpc_name, rpc_params } = body;
        if (!rpc_name) return json({ error: "missing rpc_name" }, 400);
        return handleRpc(nt, user.id, rpc_name, rpc_params || {});
      }

      default:
        return json({ error: "unknown_action" }, 400);
    }
  } catch (err) {
    console.error("[novatrack-proxy]", err);
    return json({ error: "internal_error" }, 500);
  }
});
