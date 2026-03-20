import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_CAREGIVERS = [
  { email: "demo-maria@behaviordecoded.app", password: "DemoParent1!", display_name: "Maria Santos" },
  { email: "demo-david@behaviordecoded.app", password: "DemoParent2!", display_name: "David Chen" },
  { email: "demo-aisha@behaviordecoded.app", password: "DemoParent3!", display_name: "Aisha Johnson" },
  { email: "demo-rachel@behaviordecoded.app", password: "DemoParent4!", display_name: "Rachel Kim" },
  { email: "demo-james@behaviordecoded.app", password: "DemoParent5!", display_name: "James Okafor" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is authenticated
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await anonClient.auth.getUser(token);
      if (error || !user) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: Array<{ email: string; status: string; user_id?: string }> = [];

    for (const caregiver of DEMO_CAREGIVERS) {
      // Check if user already exists
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u) => u.email === caregiver.email);

      if (existing) {
        results.push({ email: caregiver.email, status: "already_exists", user_id: existing.id });

        // Update profile display_name if needed
        await adminClient
          .from("profiles")
          .update({ display_name: caregiver.display_name })
          .eq("user_id", existing.id);

        continue;
      }

      // Create user with auto-confirm
      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email: caregiver.email,
        password: caregiver.password,
        email_confirm: true,
        user_metadata: { display_name: caregiver.display_name },
      });

      if (createErr) {
        results.push({ email: caregiver.email, status: `error: ${createErr.message}` });
        continue;
      }

      // Update profile
      if (newUser.user) {
        await adminClient
          .from("profiles")
          .update({ display_name: caregiver.display_name })
          .eq("user_id", newUser.user.id);

        results.push({ email: caregiver.email, status: "created", user_id: newUser.user.id });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
