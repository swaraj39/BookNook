import React from "react";

export function Spinner({ size = 14, color = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: "btn-spin 0.7s linear infinite", flexShrink: 0 }}
    >
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}