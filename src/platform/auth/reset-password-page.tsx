import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff } from "lucide-react";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the user arrives via reset link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      navigate("/", { replace: true });
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg text-center space-y-3">
          <h1 className="text-xl font-bold text-royal-blue">UNIKLIFE.AI</h1>
          <p className="text-sm text-gray-500">Waiting for reset link confirmation…</p>
          <p className="text-xs text-gray-400">Make sure you clicked the link from your email while this app is open.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-royal-blue">UNIKLIFE.AI</h1>
          <p className="mt-1 text-sm text-gray-500">Set a new password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">New Password</label>
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
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <div className="relative mt-1">
              <input
                id="confirm"
                type={showConfirm ? "text" : "password"}
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-royal-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-royal-blue-light focus:ring-2 focus:ring-royal-blue focus:ring-offset-2 focus:outline-none disabled:opacity-50"
          >
            {loading ? "Saving…" : "Set new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
