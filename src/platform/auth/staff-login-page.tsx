import { useState, useEffect, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuthStore, useAuthListener } from "@/hooks/use-auth";
import { Eye, EyeOff } from "lucide-react";

interface PortalConfig {
  name: string;
  logo_url: string | null;
  gradient_from: string | null;
  gradient_to: string | null;
  is_active: boolean;
}

type Mode = "login" | "forgot";

function humanizeSlug(slug: string): string {
  return slug.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export function StaffLoginPage() {
  useAuthListener();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user, activeRole, activeTenantSlug } = useAuthStore();

  const [config, setConfig] = useState<PortalConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect once authenticated — role-aware
  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;

    const platformRole = user.platform_role;

    if (platformRole === "super_admin") {
      navigate("/", { replace: true });
      return;
    }
    if (platformRole === "support_ops") {
      navigate("/support", { replace: true });
      return;
    }

    // For tenant users, wait until memberships have resolved.
    // setUser() fires before setActiveTenant(), so activeRole is null
    // for a brief moment after login — guard here prevents a premature
    // redirect to dashboard before the real role is known.
    if (activeRole === null) return;

    if (activeRole === "customer") {
      navigate("/portal", { replace: true });
      return;
    }
    // Tenant staff — use the URL slug if available, else active tenant slug
    const destination = slug ?? activeTenantSlug;
    if (destination) {
      if (activeRole === "practitioner") {
        navigate(`/t/${destination}/workspace`, { replace: true });
      } else if (activeRole === "staff") {
        navigate(`/t/${destination}/clients`, { replace: true });
      } else {
        navigate(`/t/${destination}/dashboard`, { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, user, activeRole, activeTenantSlug, slug, navigate]);

  // Load tenant branding via public RPC
  useEffect(() => {
    if (!slug) return;
    async function load() {
      const { data } = await supabase.rpc("get_portal_config", { p_slug: slug! });
      setConfig(data ?? { name: humanizeSlug(slug!), logo_url: null, gradient_from: null, gradient_to: null, is_active: true });
      setConfigLoading(false);
    }
    load().catch(() => setConfigLoading(false));
  }, [slug]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    if (mode === "forgot") {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      if (authError) {
        setError(authError.message);
      } else {
        setSuccess("Reset link sent! Check your email.");
      }
    } else {
      const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
      } else if (signInData.user) {
        const { data: membership } = await supabase
          .from("tenant_memberships")
          .select("role")
          .eq("auth_user_id", signInData.user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();
        if (membership?.role === "customer") {
          await supabase.auth.signOut();
          setError("This account does not have staff access. Please use the customer portal to sign in.");
        }
      }
    }

    setSubmitting(false);
  }

  if (configLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (config && !config.is_active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm w-full text-center rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-lg font-semibold text-gray-900">Portal unavailable</p>
          <p className="mt-2 text-sm text-gray-500">This organisation's portal is currently inactive.</p>
        </div>
      </div>
    );
  }

  const tenantName = config?.name ?? (slug ? humanizeSlug(slug) : "Your Organisation");
  const accentColor = config?.gradient_from ?? "#1e3a8a";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-10">
      {/* Branded header */}
      <div className="mb-6 flex flex-col items-center gap-3">
        {config?.logo_url ? (
          <img src={config.logo_url} alt={tenantName} className="h-14 w-auto max-w-[180px] object-contain" />
        ) : (
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-md"
            style={{ background: accentColor }}
          >
            {tenantName.charAt(0)}
          </div>
        )}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">{tenantName}</h1>
          <p className="mt-0.5 text-sm text-gray-500">Team Portal</p>
        </div>
      </div>

      {/* Auth card */}
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg space-y-5">
        {mode === "forgot" && (
          <div>
            <p className="text-sm font-medium text-gray-700">Reset your password</p>
            <button
              type="button"
              onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
              className="mt-1 text-xs text-gray-500 hover:underline"
            >
              ← Back to sign in
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {mode === "login" && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {success && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p>}

          <button
            type="submit"
            disabled={submitting}
            style={{ background: accentColor }}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-opacity"
          >
            {submitting
              ? mode === "login" ? "Signing in…" : "Sending…"
              : mode === "login" ? "Sign in" : "Send reset link"}
          </button>

          {mode === "login" && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setMode("forgot"); setError(null); setSuccess(null); }}
                className="text-xs text-gray-500 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}
        </form>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Powered by <span className="font-medium">UNIKLIFE.AI</span>
      </p>
    </div>
  );
}
