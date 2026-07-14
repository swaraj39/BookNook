import React from "react";
export function PageLoader({ fullPage }) {
  return (
    <div className="nav-loader-overlay" style={fullPage ? { top: 0 } : undefined}>
      <div className="dashboard-loader-spinner-wrap">
        <div className="dashboard-loader-spinner" />
      </div>
      <p className="dashboard-loader-text">Loading...</p>
    </div>
  );
}