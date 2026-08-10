import React from "react";

export function CharacterField({
  label,
  required = false,
  value = "",
  onChange,
  maxLength,
  type = "input",
  error,
  className = "",
}) {
  const length = typeof value === "string" ? value.length : 0;
  const overLimit = length > maxLength;

  return (
    <label className={`field char-field ${className || ""} ${overLimit ? "char-over-limit" : ""}`}>
      <span>
        {label} {required && <b>*</b>}
        <small className="char-counter">{length}/{maxLength}</small>
      </span>
      {type === "textarea" ? (
        <textarea className="textarea char-control" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="input char-control" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {error && <small>{error}</small>}
    </label>
  );
}
