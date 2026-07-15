import React, { useEffect, useRef, useState } from "react";
import { api } from "../api";

export function VerifyMagicLink({ onLogin }) {
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");
  const onLoginRef = useRef(onLogin);
  onLoginRef.current = onLogin;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link.");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const result = await api.verifyMagicLink(token);
        if (cancelled) return;
        window.history.replaceState({}, "", window.location.pathname);
        setStatus("success");
        setTimeout(() => {
          onLoginRef.current(null, result.user);
        }, 1500);
      } catch (err) {
        if (cancelled) return;
        const msg = err.message || "";
        if (msg.includes("already verified")) {
          window.history.replaceState({}, "", window.location.pathname);
          setStatus("already-verified");
          setMessage(msg);
        } else {
          setStatus("error");
          setMessage(msg || "Verification failed. The link may have expired.");
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (status === "verifying") {
    return (
      <div className="verify-magic-link-container">
        <div className="verify-card">
          <div className="verify-spinner" />
          <p>Verifying your email...</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="verify-magic-link-container">
        <div className="verify-card verify-success">
          <div className="verify-icon">&#10003;</div>
          <h2>Email Verified!</h2>
          <p>Redirecting you to the dashboard...</p>
        </div>
      </div>
    );
  }

  if (status === "already-verified") {
    return (
      <div className="verify-magic-link-container">
        <div className="verify-card verify-success">
          <div className="verify-icon">&#10003;</div>
          <h2>Already Verified</h2>
          <p>{message}</p>
          <button className="btn" onClick={() => window.location.href = "/"}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="verify-magic-link-container">
      <div className="verify-card verify-error">
        <div className="verify-icon verify-icon-error">&#10007;</div>
        <h2>Verification Failed</h2>
        <p>{message}</p>
        <button className="btn" onClick={() => window.location.href = "/"}>
          Go to Login
        </button>
      </div>
    </div>
  );
}
