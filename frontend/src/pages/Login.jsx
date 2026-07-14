import React, { useState, useEffect } from "react";
import { LogIn, UserPlus, Eye, EyeOff, Moon, Sun, KeyRound } from "lucide-react";
import { api } from "../api";
import logo from "../styles/blue_altair_logo-removebg-preview.png";
import { ForgotPassword } from "./ForgotPassword";

const ALLOWED_EMAIL_DOMAIN = "@mailinator.com";

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

const OTP_EXPIRY_SECONDS = 300;
const RESEND_COOLDOWN_SECONDS = 60;

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

  // OTP verification state
  const [signupStep, setSignupStep] = useState("form");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(OTP_EXPIRY_SECONDS);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    localStorage.setItem("bn_theme", darkMode ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // OTP timers
  useEffect(() => {
    if (signupStep !== "otp") return;
    setOtpSecondsLeft(OTP_EXPIRY_SECONDS);
    setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
    const otpTimer = setInterval(() => {
      setOtpSecondsLeft((s) => {
        if (s <= 1) { clearInterval(otpTimer); return 0; }
        return s - 1;
      });
    }, 1000);
    const resendTimer = setInterval(() => {
      setResendSecondsLeft((s) => {
        if (s <= 1) { clearInterval(resendTimer); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => { clearInterval(otpTimer); clearInterval(resendTimer); };
  }, [signupStep]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

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
    if (isRegister && !form.email.trim().endsWith(ALLOWED_EMAIL_DOMAIN)) {
      setError(`Only ${ALLOWED_EMAIL_DOMAIN} email addresses are allowed to register.`);
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
      if (isRegister) {
        const result = await api.register({
          ...form,
          email: form.email.trim(),
          fullName: form.fullName.trim(),
        });
        setRegisteredEmail(result.email);
        setOtp("");
        setSuccess("");
        setSignupStep("otp");
      } else {
        const result = await api.login(form.email.trim(), form.password);
        onLogin(null, result.user);
      }
    } catch (err) {
      switch (err.message) {
        case "Incorrect email or password.":
        case "Invalid email or password":
          setError("Incorrect email or password.");
          break;
        case "Please verify your email first. Check your inbox for the OTP.":
          setError("Please verify your email first. Check your inbox for the OTP.");
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

  async function handleOtpSubmit(e) {
    e.preventDefault();
    if (!otp.trim()) { setError("Please enter the OTP."); return; }
    if (otpSecondsLeft === 0) { setError("OTP has expired. Please request a new one."); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const result = await api.signupVerifyOtp(registeredEmail, otp.trim());
      onLogin(null, result.user);
    } catch (err) {
      setError(err.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendSecondsLeft > 0) return;
    setLoading(true); setError(""); setSuccess("");
    try {
      await api.signupResendOtp(registeredEmail);
      setOtpSecondsLeft(OTP_EXPIRY_SECONDS);
      setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
      setOtp("");
      setSuccess("A new OTP has been sent to your email.");
    } catch (err) {
      setError(err.message || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  }

  const updateForm = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // OTP verification screen after registration
  if (signupStep === "otp") {
    return (
      <div className="bn-auth bn-auth-centered" data-auth-theme={darkMode ? "dark" : "light"}>
        <div className="bn-auth-bg" aria-hidden="true">
          <div className={`bn-auth-bg-layer ${!darkMode ? "active" : ""}`} />
          <div className={`bn-auth-bg-layer ${darkMode ? "active" : ""}`} />
        </div>
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
        <div className="bn-auth-card bn-auth-card-standalone">
          <div className="bn-auth-step-header">
            <div className="bn-auth-step-icon">
              <KeyRound size={26} />
            </div>
            <h2>Verify your email</h2>
          </div>
          <p className="bn-auth-sub">
            We sent a verification code to <strong>{registeredEmail}</strong>.
            It expires in <strong style={{ color: otpSecondsLeft <= 60 ? "#B6452F" : "var(--auth-gold)" }}>{formatTime(otpSecondsLeft)}</strong>.
          </p>
          <form onSubmit={handleOtpSubmit} className="bn-auth-form">
            <div className="bn-auth-field">
              <span className="bn-auth-label" style={{ marginBottom: 8 }}>One-time code</span>
              <div className="otp-boxes-container">
                {Array.from({ length: 6 }).map((_, index) => (
                  <input
                    key={index}
                    id={`signup-otp-box-${index}`}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={1}
                    className="bn-auth-input otp-box-input"
                    value={otp[index] || ""}
                    autoFocus={index === 0}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (!val) {
                        const otpArray = otp.split("");
                        otpArray[index] = "";
                        setOtp(otpArray.join(""));
                        return;
                      }
                      const otpArray = otp.split("");
                      otpArray[index] = val.slice(-1);
                      setOtp(otpArray.join(""));
                      if (index < 5) {
                        const nextInput = document.getElementById(`signup-otp-box-${index + 1}`);
                        nextInput?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace") {
                        if (!otp[index] && index > 0) {
                          const otpArray = otp.split("");
                          otpArray[index - 1] = "";
                          setOtp(otpArray.join(""));
                          const prevInput = document.getElementById(`signup-otp-box-${index - 1}`);
                          prevInput?.focus();
                          e.preventDefault();
                        }
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                      setOtp(pastedData);
                      const targetIndex = Math.min(pastedData.length, 5);
                      const targetInput = document.getElementById(`signup-otp-box-${targetIndex}`);
                      targetInput?.focus();
                    }}
                  />
                ))}
              </div>
            </div>
            {error && <div className="bn-auth-error">{error}</div>}
            {success && <div className="bn-auth-error bn-auth-success">{success}</div>}
            <button type="submit" className="bn-auth-submit" disabled={loading || otp.length !== 6 || otpSecondsLeft === 0}>
              {loading ? "Verifying..." : "Verify email"}
            </button>
          </form>
          <div className="bn-auth-switch">
            <button
              className="bn-auth-link"
              onClick={handleResendOtp}
              disabled={resendSecondsLeft > 0 || loading}
              style={{ opacity: resendSecondsLeft > 0 ? 0.5 : 1, cursor: resendSecondsLeft > 0 ? "default" : "pointer" }}
            >
              {resendSecondsLeft > 0 ? `Resend OTP in ${formatTime(resendSecondsLeft)}` : "Resend OTP"}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <br></br>
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