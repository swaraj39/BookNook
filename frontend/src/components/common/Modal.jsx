import React, { useState } from "react";

export function Modal({ title, onClose, onSubmit, children }) {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop open">
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn icon-only" type="button" onClick={onClose}>X</button>
        </div>
        <div className="form-grid">{children}</div>
        <div className="modal-foot">
          <button className="btn" type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? <><SpinnerInline /> Saving...</> : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function SpinnerInline() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: "btn-spin 0.7s linear infinite", flexShrink: 0 }}>
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}