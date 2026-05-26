import { supabase } from "@/integrations/supabase/client";

const DEVICE_KEY = "inreco.deviceId";
const DEVICE_LABEL_KEY = "inreco.deviceLabel";

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36));
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function getDeviceLabel(): string {
  const cached = localStorage.getItem(DEVICE_LABEL_KEY);
  if (cached) return cached;
  const ua = navigator.userAgent;
  let label = "Browser";
  if (/iPhone/i.test(ua)) label = "iPhone";
  else if (/iPad/i.test(ua)) label = "iPad";
  else if (/Android/i.test(ua)) label = "Android";
  else if (/Macintosh/i.test(ua)) label = "Mac";
  else if (/Windows/i.test(ua)) label = "Windows PC";
  else if (/Linux/i.test(ua)) label = "Linux PC";
  localStorage.setItem(DEVICE_LABEL_KEY, label);
  return label;
}

export type DeviceRegistration =
  | { ok: true }
  | { ok: false; reason: "device_limit_reached" | "other"; message: string };

export async function registerCurrentDevice(): Promise<DeviceRegistration> {
  try {
    const { error } = await supabase.rpc("register_device", {
      _device_id: getDeviceId(),
      _label: getDeviceLabel(),
      _ua: navigator.userAgent,
    });
    if (error) {
      const msg = error.message || "";
      if (msg.includes("device_limit_reached")) {
        return { ok: false, reason: "device_limit_reached", message: msg };
      }
      return { ok: false, reason: "other", message: msg };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      reason: "other",
      message: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
