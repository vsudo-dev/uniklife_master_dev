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

type Mode = "login" | "signup" | "forgot";

function humanizeSlug(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function PortalLoginPage() {
  useAuthListener();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuthStore();

  const [config, setConfig] = useState<PortalConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // If already authenticated, go straight to the portal
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/portal", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Load tenant branding via public RPC (no auth required)
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
    } else if (mode === "signup") {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (authError) {
        setError(authError.message);
      } else {
        setSuccess("Account created! Check your email to confirm, then sign in.");
        setMode("login");
      }
    } else {
      const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
      } else if (signInData.user) {
        const { data: profile } = await supabase
          .from("platform_users")
          .select("platform_role")
          .eq("auth_user_id", signInData.user.id)
          .single();
        const role = profile?.platform_role;
        if (role === "super_admin" || role === "support_ops") {
          await supabase.auth.signOut();
          setError("This account does not have access to the customer portal. Please use the correct login page.");
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
          <p className="mt-2 text-sm text-gray-500">This portal is currently inactive. Please contact your practitioner.</p>
        </div>
      </div>
    );
  }

  const tenantName = config?.name ?? (slug ? humanizeSlug(slug) : "Your Portal");
  const accentColor = config?.gradient_from ?? "#1e3a8a";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-10">
      {/* Branded header */}
      <div className="mb-6 flex flex-col items-center gap-3">
        {config?.logo_url ? (
          <img
            src={config.logo_url}
            alt={tenantName}
            className="h-14 w-auto max-w-[180px] object-contain"
          />
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
          <p className="mt-0.5 text-sm text-gray-500">Member Portal</p>
        </div>
      </div>

      {/* Auth card */}
      <div className="w-full max-w-sm space-y-5 rounded-xl bg-white p-8 shadow-lg">
        {mode !== "forgot" && (
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === "login" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(null); setSuccess(null); }}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === "signup" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              Sign up
            </button>
          </div>
        )}

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
          {mode === "signup" && (
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

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

          {mode !== "forgot" && (
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
              ? mode === "login" ? "Signing in…" : mode === "forgot" ? "Sending…" : "Creating account…"
              : mode === "login" ? "Sign in" : mode === "forgot" ? "Send reset link" : "Create account"}
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
