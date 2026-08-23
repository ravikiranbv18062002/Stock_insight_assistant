import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sparkline from "../components/Sparkline";

const TICKERS = ["TSLA", "AAPL", "MSFT", "AMZN", "GOOGL"];

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
      navigate("/chat");
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-brandpane">
        <div className="brand-mark">
          <span className="dot" />
          Stock Insight
        </div>

        <div className="auth-hero">
          <h1>Price data and market news, reasoned about together.</h1>
          <p>
            A research assistant that reads structured price history and recent
            news side by side, and only answers from what it can actually find.
          </p>
          <div className="ticker-row">
            {TICKERS.map((t) => (
              <span key={t} className="ticker-chip">
                {t}
              </span>
            ))}
          </div>
          <Sparkline />
        </div>

        <div className="auth-footnote">STOCK-INSIGHT-ASSISTANT · SECURE SESSION</div>
      </div>

      <div className="auth-formpane">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p className="sub">
            {mode === "login"
              ? "Sign in to continue your research."
              : "Takes a few seconds — no confirmation email needed."}
          </p>

          {error && <div className="auth-error">{error}</div>}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading
              ? "Please wait…"
              : mode === "login"
              ? "Sign in"
              : "Create account"}
          </button>

          <div className="auth-switch">
            {mode === "login" ? (
              <>
                New here?{" "}
                <button type="button" onClick={() => setMode("register")}>
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button type="button" onClick={() => setMode("login")}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
