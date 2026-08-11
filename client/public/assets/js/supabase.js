import { SITE_CONFIG } from "./config.js";

let clientPromise;

async function getClient() {
  if (!SITE_CONFIG.supabaseUrl || !SITE_CONFIG.supabaseAnonKey) return null;
  if (!clientPromise) {
    clientPromise = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm")
      .then(({ createClient }) => createClient(SITE_CONFIG.supabaseUrl, SITE_CONFIG.supabaseAnonKey));
  }
  return clientPromise;
}

export async function saveRecord(table, payload) {
  const client = await getClient();
  if (!client) return { configured: false, data: null, error: null };
  const { data, error } = await client.from(table).insert(payload).select().single();
  return { configured: true, data, error };
}

export async function recordCloudVisit(path) {
  return saveRecord("site_events", {
    event_type: "page_view",
    path,
    metadata: { referrer: document.referrer || null },
  });
}

export function isCloudConfigured() {
  return Boolean(SITE_CONFIG.supabaseUrl && SITE_CONFIG.supabaseAnonKey);
}