import React from "react";
export function FormInput({ label: labelText, value, onChange, type = "text", required = false, error, className = "" }) {
  return <label className={`field ${className}`}><span>{labelText} {required && <b>*</b>}</span><input className="input" type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />{error && <small>{error}</small>}</label>;
}