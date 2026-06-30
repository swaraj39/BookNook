import React, { useState, useEffect } from "react";
import { LogIn, UserPlus, Eye, EyeOff, Moon, Sun } from "lucide-react";
import { api } from "../api";
import logo from "../styles/blue_altair_logo-removebg-preview.png";
import { ForgotPassword } from "./ForgotPassword";

/* Placeholder assets — swap these for your real book photo + animated SVGs.
   Keep the same import shape (default export usable as a CSS background or
   inline component) so swapping later is a one-line change. */
import authImagePlaceholder from "../styles/images/pexels-tima-miroshnichenko-9572505.jpg";

function AuthBackgroundLight() {
  // Placeholder self-animating SVG (light mode). Replace with your own file —
  // paste its <svg>...</svg> markup directly in here so its internal
  // <animate>/CSS keyframes keep running.
  return (
    <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="bnLightGlow" cx="70%" cy="20%" r="70%">
          <stop offset="0%" stopColor="#F3E3BE" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FBF6EC" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="800" fill="#FBF6EC" />
      <circle cx="860" cy="160" r="260" fill="url(#bnLightGlow)">
        <animate attributeName="r" values="260;300;260" dur="8s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function AuthBackgroundDark() {
  // Placeholder self-animating SVG (dark mode). Replace likewise.
  return (
    <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="bnDarkGlow" cx="75%" cy="15%" r="65%">
          <stop offset="0%" stopColor="#3A2E14" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#14181F" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="800" fill="#14181F" />
      <circle cx="880" cy="150" r="240" fill="url(#bnDarkGlow)">
        <animate attributeName="r" values="240;280;240" dur="9s" repeatCount="indefinite" />
      </circle>
      {[...Array(18)].map((_, i) => (
        <circle
          key={i}
          cx={60 + ((i * 67) % 1140)}
          cy={40 + ((i * 113) % 760)}
          r={Math.random() * 1.4 + 0.4}
          fill="#EDE6D8"
          opacity="0.5"
        >
          <animate
            attributeName="opacity"
            values="0.1;0.6;0.1"
            dur={`${3 + (i % 5)}s`}
            begin={`${i * 0.3}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </svg>
  );
}

export function Login({ onLogin }) {
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    team: "APIM",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("bn_theme") === "dark"
  );

  useEffect(() => {
    localStorage.setItem("bn_theme", darkMode ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const passwordRules = {
    minLength: form.password.length >= 8,
    lowercase: /[a-z]/.test(form.password),
    uppercase: /[A-Z]/.test(form.password),
    number: /\d/.test(form.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(form.password),
  };
  const isPasswordValid = Object.values(passwordRules).every(Boolean);
  const allPasswordRulesValid = isPasswordValid;

  if (showForgotPassword) {
    return (
      <ForgotPassword
        onBack={() => setShowForgotPassword(false)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError("Please enter your email and password.");
      return;
    }
    if (isRegister && (!form.fullName.trim() || !form.team)) {
      setError("Please complete all required fields.");
      return;
    }
    if (isRegister && !isPasswordValid) {
      setError(
        "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character."
      );
      return;
    }
    setLoading(true);
    setError("");
    try {
      let result;
      if (isRegister) {
        result = await api.register({
          ...form,
          email: form.email.trim(),
          fullName: form.fullName.trim(),
        });
      } else {
        result = await api.login(form.email.trim(), form.password);
      }
      onLogin(null, result.user);
    } catch (err) {
      switch (err.message) {
        case "Incorrect email or password.":
        case "Invalid email or password":
          setError("Incorrect email or password.");
          break;
        case "An account with this email already exists. Please sign in instead.":
        case "Email already exists.":
          setError(
            "An account with this email already exists. Please sign in instead."
          );
          break;
        case "Unauthorized":
          setError("Your session has expired. Please sign in again.");
          break;
        case "Failed to fetch":
          setError(
            "Unable to connect to the server. Please check your internet connection."
          );
          break;
        default:
          setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const updateForm = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="bn-auth" data-auth-theme={darkMode ? "dark" : "light"}>
      {/* Layer 0 — animated background SVG, crossfades between light/dark */}
      <div className="bn-auth-bg" aria-hidden="true">
        <div className={`bn-auth-bg-layer ${!darkMode ? "active" : ""}`}>
          <AuthBackgroundLight />
        </div>
        <div className={`bn-auth-bg-layer ${darkMode ? "active" : ""}`}>
          <AuthBackgroundDark />
        </div>
      </div>

      {/* Layer 1 — curved book-edge image panel, slides in from the right */}
      <div
        className="bn-auth-image-wrap"
        style={{ "--bn-auth-image": `url(${authImagePlaceholder})` }}
      >
        <div className="bn-auth-image-bg" />
        <div className="bn-auth-image-vignette" />
        <div className="bn-auth-image-fade" />
        <div className="bn-auth-image-copy">
          <div className="bn-auth-brand-inline">
            <img src={logo} alt="Logo" />
            <h1>Book Nook</h1>
          </div>
          <p>
            A quiet shelf for the books your neighbours have already loved —
            borrow, lend, and keep the story moving.
          </p>
        </div>
      </div>

      {/* Layer 2 — toggle + sign-in card */}
      <div className="bn-auth-right">
        <button
          type="button"
          className="bn-theme-toggle"
          onClick={() => setDarkMode((v) => !v)}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          <span className="bn-icon-spin" key={darkMode ? "sun" : "moon"}>
            {darkMode ? <Sun size={19} /> : <Moon size={19} />}
          </span>
        </button>

        <div className="bn-auth-card">
          <div className="bn-auth-card-brand">
            <img src={logo} alt="Book Nook logo" />
            <span>Book Nook</span>
          </div>
          <h2>{isRegister ? "Create an account" : "Welcome back"}</h2>
          <p className="bn-auth-sub">
            {isRegister
              ? "Join the community library today."
              : "Sign in to pick up where you left off."}
          </p>

          <form onSubmit={handleSubmit} className="bn-auth-form">
            {isRegister && (
              <>
                <label className="bn-auth-field">
                  <span className="bn-auth-label">Full name</span>
                  <input
                    type="text"
                    className="bn-auth-input"
                    value={form.fullName}
                    onChange={(e) => updateForm("fullName", e.target.value)}
                    required
                    placeholder="Enter your name"
                    maxLength={60}
                  />
                </label>
                <label className="bn-auth-field">
                  <span className="bn-auth-label">Capability</span>
                  <select
                    className="bn-auth-select"
                    value={form.team}
                    onChange={(e) => updateForm("team", e.target.value)}
                    required
                  >
                    <option value="APIM">APIM</option>
                    <option value="DAD">DAD</option>
                    <option value="DM">DM</option>
                    <option value="AI">AI</option>
                    <option value="SF">SF</option>
                    <option value="CS">CS</option>
                  </select>
                </label>
              </>
            )}

            <label className="bn-auth-field">
              <span className="bn-auth-label">Email address</span>
              <input
                type="email"
                className="bn-auth-input"
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
                required
                placeholder="you@example.com"
                maxLength={100}
              />
            </label>

            <label className="bn-auth-field">
              <span className="bn-auth-label">Password</span>
              <div className="bn-auth-password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  className="bn-auth-input"
                  value={form.password}
                  onChange={(e) => updateForm("password", e.target.value)}
                  required
                  placeholder="Password"
                  maxLength={72}
                />
                <button
                  type="button"
                  className="bn-auth-pw-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {isRegister && !allPasswordRulesValid && (
                <div className="bn-auth-rules">
                  <small>Password must contain:</small>
                  <ul>
                    <li className={passwordRules.lowercase ? "valid" : ""}>Lowercase letter</li>
                    <li className={passwordRules.uppercase ? "valid" : ""}>Uppercase letter</li>
                    <li className={passwordRules.number ? "valid" : ""}>Number</li>
                    <li className={passwordRules.special ? "valid" : ""}>Special character</li>
                    <li className={passwordRules.minLength ? "valid" : ""}>Minimum 8 characters</li>
                  </ul>
                </div>
              )}
            </label>

            {!isRegister && (
              <div className="bn-auth-forgot">
                <button
                  type="button"
                  className="bn-auth-link"
                  onClick={() => {
                    setError("");
                    setShowForgotPassword(true);
                  }}
                >
                  Forgot your password?
                </button>
              </div>
            )}

            {error && <div className="bn-auth-error">{error}</div>}

            <button type="submit" className="bn-auth-submit" disabled={loading}>
              {loading ? (
                isRegister ? "Creating account..." : "Signing in..."
              ) : isRegister ? (
                <><UserPlus size={18} /> Create account</>
              ) : (
                <><LogIn size={18} /> Sign in</>
              )}
            </button>
          </form>

          <div className="bn-auth-switch">
            <button
              type="button"
              className="bn-auth-link"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
                setShowPassword(false);
              }}
            >
              {isRegister
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}