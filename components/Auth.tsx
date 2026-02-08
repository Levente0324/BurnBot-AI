import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { signIn, signUp } from "../services/authService";

interface AuthProps {
  mode: "login" | "signup";
}

const Auth: React.FC<AuthProps> = ({ mode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setConfirmMsg(null);

    try {
      if (mode === "signup") {
        const result = await signUp(email, password);
        if (result.error) {
          setError(result.error);
          setLoading(false);
          return;
        }
        // Some Supabase projects require email confirmation
        if (result.user && !result.user.confirmed_at) {
          setConfirmMsg(
            "Check your email to confirm your account, then log in.",
          );
          setLoading(false);
          return;
        }
        // Auto-confirmed — go straight to dashboard
        navigate("/dashboard");
      } else {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error);
          setLoading(false);
          return;
        }
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-orange-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      <Link
        to="/"
        className="mb-10 font-bold text-3xl tracking-tight flex items-center gap-3 relative z-10 group"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-[#7C3AED] to-purple-900 rounded-lg flex items-center justify-center text-white shadow-[0_0_20px_rgba(124,58,237,0.5)] group-hover:scale-110 transition-transform">
          B
        </div>
        <span className="text-white tracking-tighter uppercase">
          BurnBot AI
        </span>
      </Link>

      <div className="w-full max-w-md bg-[#0A0A0A] border border-gray-800 rounded-2xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 backdrop-blur-sm">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-wide">
            {mode === "login" ? "Access The Mainframe" : "Initiate Protocol"}
          </h2>
          <p className="text-gray-500 text-sm font-mono">
            {mode === "login"
              ? "Enter credentials to continue."
              : "Create an identity to start burning."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-900/40 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm font-mono">
              {error}
            </div>
          )}
          {confirmMsg && (
            <div className="bg-green-900/40 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg text-sm font-mono">
              {confirmMsg}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 bg-[#121212] rounded-lg border border-gray-800 text-white focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] outline-none transition-all placeholder-gray-700 font-mono text-sm"
              placeholder="user@burnbot.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full px-4 py-3 bg-[#121212] rounded-lg border border-gray-800 text-white focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] outline-none transition-all placeholder-gray-700 font-mono text-sm"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {mode === "signup" && (
            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                required
                id="tos"
                className="mt-1 rounded bg-gray-800 border-gray-700 text-[#7C3AED] focus:ring-[#7C3AED] focus:ring-offset-black"
              />
              <label
                htmlFor="tos"
                className="text-xs text-gray-500 leading-relaxed"
              >
                I agree to the{" "}
                <span className="text-gray-300 hover:text-[#7C3AED] cursor-pointer transition-colors">
                  Terms of Service
                </span>
                . I acknowledge that I am responsible for the emotional damage
                caused.
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white rounded-lg font-bold text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading
              ? "Processing..."
              : mode === "login"
                ? "Log In"
                : "Create Account"}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-gray-500 font-mono">
          {mode === "login" ? (
            <>
              No account?{" "}
              <Link
                to="/signup"
                className="text-[#7C3AED] hover:text-white transition-colors ml-2 font-bold"
              >
                SIGN UP
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-[#7C3AED] hover:text-white transition-colors ml-2 font-bold"
              >
                LOG IN
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
