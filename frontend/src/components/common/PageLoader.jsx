import React from "react";
export function PageLoader() {
  return (
    <div className="nav-loader-overlay">
      <div className="dashboard-loader-spinner-wrap">
        <div className="dashboard-loader-spinner" />
      </div>
      <p className="dashboard-loader-text">Loading...</p>
    </div>
  );
}