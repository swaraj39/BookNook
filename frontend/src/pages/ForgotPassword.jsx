import React, { useState, useEffect } from "react";
import { Eye, EyeOff, ArrowLeft, Mail, KeyRound, Lock } from "lucide-react";
import { api } from "../api";

const passwordRules = (password) => ({
  minLength: password.length >= 8,
  lowercase: /[a-z]/.test(password),
  uppercase: /[A-Z]/.test(password),
  number: /\d/.test(password),
  special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
});

const OTP_EXPIRY_SECONDS = 90;   // 1:30 min
const RESEND_COOLDOWN_SECONDS = 60; // 1 min

export function ForgotPassword({ onBack }) {
  const [step, setStep] = useState("email"); // "email" | "otp" | "reset"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // OTP expiry countdown (90s)
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(OTP_EXPIRY_SECONDS);
  // Resend cooldown (60s)
  const [resendSecondsLeft, setResendSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (step !== "otp") return;
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
  }, [step]);

  const rules = passwordRules(password);
  const isPasswordValid = Object.values(rules).every(Boolean);
  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  async function handleEmailSubmit(e) {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email."); return; }
    setLoading(true); setError("");
    try {
      await api.forgotPasswordRequest(email.trim());
      setStep("otp");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendSecondsLeft > 0) return;
    setLoading(true); setError(""); setSuccess("");
    try {
      await api.forgotPasswordRequest(email.trim());
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

  async function handleOtpSubmit(e) {
    e.preventDefault();
    if (!otp.trim()) { setError("Please enter the OTP."); return; }
    if (otpSecondsLeft === 0) { setError("OTP has expired. Please request a new one."); return; }
    setLoading(true); setError("");
    try {
      await api.forgotPasswordVerifyOtp(email.trim(), otp.trim());
      setStep("reset");
    } catch (err) {
      setError(err.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSubmit(e) {
    e.preventDefault();
    if (!isPasswordValid) {
      setError("Password does not meet the required criteria.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true); setError("");
    try {
      await api.forgotPasswordReset(email.trim(), otp.trim(), password);
      setSuccess("Password reset successfully! You can now sign in.");
      setTimeout(() => onBack(), 2000);
    } catch (err) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <button className="btn-link forgot-back-btn" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 14 }}>
          <ArrowLeft size={15} /> Back to Sign In
        </button>

        {step === "email" && (
          <>
            <div className="brand-large" style={{ marginBottom: 8 }}>
              <Mail size={32} style={{ color: "var(--brand)" }} />
            </div>
            <h2>Forgot password?</h2>
            <p>Enter the email address associated with your account and we'll send you a one-time code.</p>
            <form onSubmit={handleEmailSubmit} className="form-grid">
              <label className="field full">
                <span>Email address</span>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  maxLength={100}
                  autoFocus
                />
              </label>
              {error && <div className="error-box">{error}</div>}
              <button type="submit" className="btn primary full" disabled={loading}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          </>
        )}

        {step === "otp" && (
          <>
            <div className="brand-large" style={{ marginBottom: 8 }}>
              <KeyRound size={32} style={{ color: "var(--brand)" }} />
            </div>
            <h2>Enter OTP</h2>
            <p>We sent a 6-digit code to <strong>{email}</strong>. It expires in <strong style={{ color: otpSecondsLeft <= 20 ? "var(--danger)" : "var(--brand)" }}>{formatTime(otpSecondsLeft)}</strong>.</p>
            <form onSubmit={handleOtpSubmit} className="form-grid">
              <label className="field full">
                <span>One-time code</span>
                <input
                  type="text"
                  className="input"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  placeholder="6-digit code"
                  maxLength={6}
                  inputMode="numeric"
                  autoFocus
                />
              </label>
              {error && <div className="error-box">{error}</div>}
              {success && <div className="error-box" style={{ background: "var(--brand-soft)", color: "var(--brand)", borderColor: "var(--brand)" }}>{success}</div>}
              <button type="submit" className="btn primary full" disabled={loading || otpSecondsLeft === 0}>
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
            </form>
            <div style={{ marginTop: 12, textAlign: "center", fontSize: 13 }}>
              <button
                className="btn-link"
                onClick={handleResendOtp}
                disabled={resendSecondsLeft > 0 || loading}
                style={{ opacity: resendSecondsLeft > 0 ? 0.5 : 1, cursor: resendSecondsLeft > 0 ? "default" : "pointer" }}
              >
                {resendSecondsLeft > 0 ? `Resend OTP in ${formatTime(resendSecondsLeft)}` : "Resend OTP"}
              </button>
            </div>
          </>
        )}

        {step === "reset" && (
          <>
            <div className="brand-large" style={{ marginBottom: 8 }}>
              <Lock size={32} style={{ color: "var(--brand)" }} />
            </div>
            <h2>Set new password</h2>
            <p>Choose a strong new password for your account.</p>
            <form onSubmit={handleResetSubmit} className="form-grid">
              <label className="field full">
                <span>New password</span>
                <div className="password-input-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="New password"
                    maxLength={72}
                    autoFocus
                  />
                  <button type="button" className="password-toggle-btn" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {!isPasswordValid && (
                  <div className="password-rules">
                    <small>Password must contain:</small>
                    <ul>
                      <li className={rules.lowercase ? "valid" : ""}>Lowercase letter</li>
                      <li className={rules.uppercase ? "valid" : ""}>Uppercase letter</li>
                      <li className={rules.number ? "valid" : ""}>Number</li>
                      <li className={rules.special ? "valid" : ""}>Special character</li>
                      <li className={rules.minLength ? "valid" : ""}>Minimum 8 characters</li>
                    </ul>
                  </div>
                )}
              </label>
              <label className="field full">
                <span>Confirm new password</span>
                <div className="password-input-wrap">
                  <input
                    type={showConfirm ? "text" : "password"}
                    className="input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm new password"
                    maxLength={72}
                  />
                  <button type="button" className="password-toggle-btn" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}>
                    {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>
              {error && <div className="error-box">{error}</div>}
              {success && <div className="error-box" style={{ background: "var(--brand-soft)", color: "var(--brand)", borderColor: "var(--brand)" }}>{success}</div>}
              <button type="submit" className="btn primary full" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}