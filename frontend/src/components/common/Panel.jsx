import React from "react";
export function Panel({ title, badge, actions, children }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>{title}</h3>
        <div className="panel-head-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {badge && <span className="chip">{badge}</span>}
          {actions}
        </div>
      </div>
      {children}
    </div>
  );
}