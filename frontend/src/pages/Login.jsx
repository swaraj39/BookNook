import React, { useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { api } from "../api";

export function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    team: "APIM"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) return;
    if (isRegister && (!form.fullName || !form.team)) return;
    
    setLoading(true);
    setError("");
    try {
      let result;
      if (isRegister) {
        result = await api.register(form);
      } else {
        result = await api.login(form.email, form.password);
      }
      onLogin(result.token, result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-large">
          <div className="brand-mark">BN</div>
          <h1>Book Nook</h1>
        </div>
        
        <h2>{isRegister ? "Create an account" : "Sign in to your account"}</h2>
        <p>{isRegister ? "Join the community library today." : "Enter your credentials to access the community library."}</p>
        
        <form onSubmit={handleSubmit} className="form-grid">
          {isRegister && (
            <>
              <label className="field full">
                <span>Full Name</span>
                <input 
                  type="text" 
                  className="input" 
                  value={form.fullName} 
                  onChange={(e) => updateForm("fullName", e.target.value)} 
                  required 
                  placeholder="Gaurav Choudhary"
                />
              </label>
              <label className="field full">
                <span>Capability</span>
                <select 
                  className="select" 
                  value={form.team} 
                  onChange={(e) => updateForm("team", e.target.value)} 
                  required
                >
                  <option value="APIM">APIM</option>
                  <option value="DAD">DAD</option>
                  <option value="DM">DM</option>
                  <option value="AI">AI</option>
                  <option value="SF">SF</option>
                </select>
              </label>
            </>
          )}

          <label className="field full">
            <span>Email address</span>
            <input 
              type="email" 
              className="input" 
              value={form.email} 
              onChange={(e) => updateForm("email", e.target.value)} 
              required 
              placeholder="gaurav.choudhary@booknook.com"
            />
          </label>
          
          <label className="field full">
            <span>Password</span>
            <input 
              type="password" 
              className="input" 
              value={form.password} 
              onChange={(e) => updateForm("password", e.target.value)} 
              required 
              placeholder="••••••••"
            />
          </label>

          {error && <div className="error-box">{error}</div>}

          <button type="submit" className="btn btn-primary full" disabled={loading}>
            {loading ? (isRegister ? "Creating account..." : "Signing in...") : (
              isRegister ? <><UserPlus size={18} /> Create Account</> : <><LogIn size={18} /> Sign In</>
            )}
          </button>
        </form>

        <div className="login-toggle">
          <button className="btn-link" onClick={() => {
            setIsRegister(!isRegister);
            setError("");
          }}>
            {isRegister ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </div>

        {!isRegister && (
          <div className="login-footer">
            <p>Mock Credentials: <strong>password</strong></p>
          </div>
        )}
      </div>
    </div>
  );
}
