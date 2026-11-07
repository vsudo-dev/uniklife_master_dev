import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff } from "lucide-react";

type Mode = "login" | "signup" | "forgot";

export function LoginPage({ initialMode = "login" }: { initialMode?: Mode } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPublicRoute = location.pathname.startsWith("/auth/");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === "login") {
      const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        setError(authError.message);
      } else if (signInData.user) {
        const { data: profile } = await supabase
          .from("platform_users")
          .select("platform_role")
          .eq("auth_user_id", signInData.user.id)
          .single();
        const role = profile?.platform_role;
        if (role !== "super_admin" && role !== "support_ops" && isPublicRoute) {
          await supabase.auth.signOut();
          setError("This login is for platform administrators only. Please use your organisation's login page.");
        } else if (isPublicRoute) {
          navigate("/", { replace: true });
        }
      }
    } else if (mode === "forgot") {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      if (authError) {
        setError(authError.message);
      } else {
        setSuccess("Reset link sent! Check your email, then click the link while this app is running.");
      }
    } else {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (authError) {
        setError(authError.message);
      } else {
        setSuccess(
          "Account created! Check your email to confirm, then sign in."
        );
        setMode("login");
      }
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-royal-blue">UNIKLIFE.AI</h1>
          <p className="mt-1 text-sm text-gray-500">
            {mode === "login"
              ? "Sign in to your account"
              : "Create your account"}
          </p>
        </div>

        {mode !== "forgot" && (
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === "login" ? "bg-white text-royal-blue shadow-sm" : "text-gray-500"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(null); setSuccess(null); }}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === "signup" ? "bg-white text-royal-blue shadow-sm" : "text-gray-500"}`}
            >
              Sign up
            </button>
          </div>
        )}
        {mode === "forgot" && (
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Reset your password</p>
            <button type="button" onClick={() => { setMode("login"); setError(null); setSuccess(null); }} className="mt-1 text-xs text-royal-blue hover:underline">
              ← Back to sign in
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-gray-700"
              >
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
                placeholder="Venkatesh"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
              placeholder="you@example.com"
            />
          </div>

          {mode !== "forgot" && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
                  placeholder="••••••••"
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

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-royal-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-royal-blue-light focus:ring-2 focus:ring-royal-blue focus:ring-offset-2 focus:outline-none disabled:opacity-50"
          >
            {loading
              ? mode === "login" ? "Signing in…" : mode === "forgot" ? "Sending…" : "Creating account…"
              : mode === "login" ? "Sign in" : mode === "forgot" ? "Send reset link" : "Create account"}
          </button>

          {mode === "login" && (
            <div className="text-center">
              <button type="button" onClick={() => { setMode("forgot"); setError(null); setSuccess(null); }} className="text-xs text-gray-500 hover:text-royal-blue hover:underline">
                Forgot password?
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
