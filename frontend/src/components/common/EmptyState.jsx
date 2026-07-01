import React from "react";
import * as Icons from "lucide-react";
export function EmptyState({ icon, title, message, actionLabel, onAction }) {
  const Icon = Icons[icon] || Icons.Inbox;
  return (
    <div className="panel empty full empty-state-box">
      <div className="empty-state-icon">
        <Icon size={48} strokeWidth={1.5} />
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
      {actionLabel && (
        <button className="btn primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}