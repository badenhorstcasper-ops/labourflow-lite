import { createClient } from "npm:@supabase/supabase-js@2";

const OWNERS = ["badenhorst.casper@gmail.com", "casperbadenhorst77@outlook.com"];

Deno.serve(async (req) => {
  const key = req.headers.get("x-owner-key");
  if (!key || key !== Deno.env.get("OWNER_RESET_KEY")) {
    return new Response("forbidden", { status: 403 });
  }
  const { password } = await req.json();
  if (!password || String(password).length < 8) {
    return new Response("bad password", { status: 400 });
  }
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const out: Record<string, string> = {};
  for (const email of OWNERS) {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = list?.users?.find((u) => (u.email ?? "").toLowerCase() === email);
    if (user) {
      const { error } = await admin.auth.admin.updateUserById(user.id, {
        password,
        email_confirm: true,
      });
      out[email] = error ? `error: ${error.message}` : "password updated";
    } else {
      const { error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      out[email] = error ? `error: ${error.message}` : "created";
    }
  }
  return new Response(JSON.stringify(out), {
    headers: { "Content-Type": "application/json" },
  });
});
