import React from "react";
export function Stat({ label, value, onClick }) {
  return (
    <article className="stat" onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}