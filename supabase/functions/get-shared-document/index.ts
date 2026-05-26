// Public share-link resolver. Looks up a generated_documents row by share_token,
// validates expiry/revocation, and returns short-lived signed URLs for the PDF/DOCX.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let token = url.searchParams.get("token");
    if (!token && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      token = body?.token ?? null;
    }
    if (!token || typeof token !== "string" || token.length < 8) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: doc, error } = await supabase
      .from("generated_documents")
      .select(
        "id, owner_user_id, title, doc_number, doc_type, pdf_path, docx_path, share_expires_at, revoked_at, created_at"
      )
      .eq("share_token", token)
      .maybeSingle();
    if (error) throw error;
    if (!doc) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (doc.revoked_at) {
      return new Response(JSON.stringify({ error: "revoked" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(doc.share_expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: company } = await supabase
      .from("company_profiles")
      .select("company_name, trading_name, logo_url, accent_color")
      .eq("owner_user_id", doc.owner_user_id)
      .maybeSingle();

    const expires = 60 * 30; // 30 min
    let pdf_url: string | null = null;
    let docx_url: string | null = null;
    if (doc.pdf_path) {
      const { data } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.pdf_path, expires);
      pdf_url = data?.signedUrl ?? null;
    }
    if (doc.docx_path) {
      const { data } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.docx_path, expires);
      docx_url = data?.signedUrl ?? null;
    }

    return new Response(
      JSON.stringify({
        title: doc.title,
        doc_number: doc.doc_number,
        doc_type: doc.doc_type,
        created_at: doc.created_at,
        expires_at: doc.share_expires_at,
        company: company ?? null,
        pdf_url,
        docx_url,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("get-shared-document error", e);
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
