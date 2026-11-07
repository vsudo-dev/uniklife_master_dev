import { createClient } from "@supabase/supabase-js";

const CRM_URL = import.meta.env.VITE_CRM_BASE_URL as string;
const CRM_ANON_KEY = import.meta.env.VITE_CRM_ANON_KEY as string;
const CRM_EMAIL = import.meta.env.VITE_CRM_EMAIL as string;
const CRM_PASSWORD = import.meta.env.VITE_CRM_PASSWORD as string;

export const CRM_SUB_ACCOUNT_ID =
  (import.meta.env.VITE_CRM_SUB_ACCOUNT_ID || import.meta.env.VITE_MYAPPZ_LOCATION_ID) as string;

// Supabase client uses anon key for Kong gateway (apikey header)
const _auth = createClient(CRM_URL, CRM_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: true },
});

let _sessionPromise: Promise<string> | null = null;

/** Returns a fresh CRM session JWT (auto-cached, auto-refreshed). */
async function getSessionToken(): Promise<string> {
  if (!_sessionPromise) {
    _sessionPromise = (async () => {
      const { data, error } = await _auth.auth.signInWithPassword({
        email: CRM_EMAIL,
        password: CRM_PASSWORD,
      });
      if (error) {
        _sessionPromise = null;
        throw new Error(`CRM auth failed: ${error.message}`);
      }
      return data.session.access_token;
    })();
  }
  return _sessionPromise;
}

/** All CRM REST calls go through this — anon key for gateway, session JWT for data. */
export async function crmFetch(path: string, opts?: RequestInit): Promise<Response> {
  const token = await getSessionToken();
  const url = `${CRM_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      apikey: CRM_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) {
    if (res.status === 401) {
      // Session expired — clear cache and retry once
      _sessionPromise = null;
      return crmFetch(path, opts);
    }
    const body = await res.text().catch(() => "");
    throw new Error(`CRM ${res.status}: ${body || res.statusText}`);
  }
  return res;
}

export async function ensureCrmAuth(): Promise<void> {
  await getSessionToken();
}
