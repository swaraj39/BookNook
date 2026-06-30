import React from "react";
export function Panel({ title, badge, actions, children }) {
  return <div className="panel"><div className="panel-head"><h3>{title}</h3><div style={{ display: "flex", gap: "8px", alignItems: "center" }}>{badge && <span className="chip">{badge}</span>}{actions}</div></div>{children}</div>;
}