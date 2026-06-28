import { supabase } from "@/integrations/supabase/client";

// Extract the object path under the company-logos bucket from any stored value.
// Accepts either a bare path ("uuid/logo.png") or a full Supabase public URL
// from before the bucket was made private. Returns null if not a logos value.
export function extractLogoPath(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.split("?")[0].trim();
  if (!trimmed) return null;
  const marker = "/company-logos/";
  const idx = trimmed.indexOf(marker);
  if (idx >= 0) return trimmed.slice(idx + marker.length);
  if (/^https?:\/\//i.test(trimmed)) return null; // external URL, not our bucket
  return trimmed; // already a path
}

// Returns a short-lived signed URL for a company logo, or the original value
// if it's an external URL we don't manage. Returns null when there is no logo.
export async function resolveLogoUrl(
  value?: string | null,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!value) return null;
  const path = extractLogoPath(value);
  if (!path) {
    // external URL → use as-is
    return /^https?:\/\//i.test(value) ? value : null;
  }
  const { data } = await supabase.storage
    .from("company-logos")
    .createSignedUrl(path, expiresInSeconds);
  return data?.signedUrl ?? null;
}
