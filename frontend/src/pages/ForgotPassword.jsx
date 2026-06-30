import React, { useState, useEffect } from "react";
import { Eye, EyeOff, ArrowLeft, Mail, KeyRound, Lock, Moon, Sun } from "lucide-react";
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

export function ForgotPassword({ onBack, darkMode: darkModeProp, setDarkMode: setDarkModeProp }) {
    // Works standalone (own theme state) or controlled by a parent (Login passes both props down).
    const [localDarkMode, setLocalDarkMode] = useState(
        () => localStorage.getItem("bn_theme") === "dark"
    );
    const darkMode = darkModeProp !== undefined ? darkModeProp : localDarkMode;
    const setDarkMode = setDarkModeProp || setLocalDarkMode;
    useEffect(() => {
        if (setDarkModeProp) return; // parent already persists theme
        localStorage.setItem("bn_theme", darkMode ? "dark" : "light");
        document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    }, [darkMode, setDarkModeProp]);

    const [step, setStep] = useState("email");
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
                <button className="bn-auth-link bn-auth-back-btn" onClick={onBack}>
                    <ArrowLeft size={15} /> Back to sign in
                </button>
                {step === "email" && (
                    <>
                        <div className="bn-auth-step-header-row">
                            <div className="bn-auth-step-icon">
                                <Mail size={22} />
                            </div>
                            <h2>Forgot password?</h2>
                        </div>
                        <p className="bn-auth-sub">Enter the email address associated with your account and we'll send you a one-time code.</p>
                        <form onSubmit={handleEmailSubmit} className="bn-auth-form">
                            <label className="bn-auth-field">
                                <span className="bn-auth-label">Email address</span>
                                <input
                                    type="email"
                                    className="bn-auth-input"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="Enter your email"
                                    maxLength={100}
                                    autoFocus
                                />
                            </label>
                            {error && <div className="bn-auth-error">{error}</div>}
                            <button type="submit" className="bn-auth-submit" disabled={loading}>
                                {loading ? "Sending OTP..." : "Send OTP"}
                            </button>
                        </form>
                    </>
                )}
                {step === "otp" && (
                    <>
                        <div className="bn-auth-step-icon">
                            <KeyRound size={26} />
                        </div>
                        <h2>Enter OTP</h2>
                        <p className="bn-auth-sub">We sent a 6-digit code to <strong>{email}</strong>. It expires in <strong style={{ color: otpSecondsLeft <= 20 ? "#B6452F" : "var(--auth-gold)" }}>{formatTime(otpSecondsLeft)}</strong>.</p>
                        <form onSubmit={handleOtpSubmit} className="bn-auth-form">
                            <div className="bn-auth-field">
                                <span className="bn-auth-label" style={{ marginBottom: 8 }}>One-time code</span>
                                <div className="otp-boxes-container">
                                    {Array.from({ length: 6 }).map((_, index) => (
                                        <input
                                            key={index}
                                            id={`otp-box-${index}`}
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
                                                    const nextInput = document.getElementById(`otp-box-${index + 1}`);
                                                    nextInput?.focus();
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Backspace") {
                                                    if (!otp[index] && index > 0) {
                                                        const otpArray = otp.split("");
                                                        otpArray[index - 1] = "";
                                                        setOtp(otpArray.join(""));
                                                        const prevInput = document.getElementById(`otp-box-${index - 1}`);
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
                                                const targetInput = document.getElementById(`otp-box-${targetIndex}`);
                                                targetInput?.focus();
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                            {error && <div className="bn-auth-error">{error}</div>}
                            {success && <div className="bn-auth-error bn-auth-success">{success}</div>}
                            <button type="submit" className="bn-auth-submit" disabled={loading || otp.length !== 6 || otpSecondsLeft === 0}>
                                {loading ? "Verifying..." : "Verify OTP"}
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
                    </>
                )}
                {step === "reset" && (
                    <>
                        <div className="bn-auth-step-icon">
                            <Lock size={26} />
                        </div>
                        <h2>Set new password</h2>
                        <p className="bn-auth-sub">Choose a strong new password for your account.</p>
                        <form onSubmit={handleResetSubmit} className="bn-auth-form">
                            <label className="bn-auth-field">
                                <span className="bn-auth-label">New password</span>
                                <div className="bn-auth-password-wrap">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="bn-auth-input"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        placeholder="New password"
                                        maxLength={72}
                                        autoFocus
                                    />
                                    <button type="button" className="bn-auth-pw-toggle" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
                                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                                {!isPasswordValid && (
                                    <div className="bn-auth-rules">
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
                            <label className="bn-auth-field">
                                <span className="bn-auth-label">Confirm new password</span>
                                <div className="bn-auth-password-wrap">
                                    <input
                                        type={showConfirm ? "text" : "password"}
                                        className="bn-auth-input"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        placeholder="Confirm new password"
                                        maxLength={72}
                                    />
                                    <button type="button" className="bn-auth-pw-toggle" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}>
                                        {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                            </label>
                            {error && <div className="bn-auth-error">{error}</div>}
                            {success && <div className="bn-auth-error bn-auth-success">{success}</div>}
                            <button type="submit" className="bn-auth-submit" disabled={loading}>
                                {loading ? "Resetting..." : "Reset password"}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}