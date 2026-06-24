import React, { useState } from "react";

function SpinnerInline() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: "btn-spin 0.7s linear infinite", flexShrink: 0 }}>
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

export function ConfirmDialog({ message, onConfirm, onCancel }) {
  const [loading, setLoading] = useState(false);

  if (!message) return null;

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop open" onClick={!loading ? onCancel : undefined}>
      <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Are you sure?</h3>
        </div>
        <div className="confirm-body">
          <p>{message}</p>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="btn danger" onClick={handleConfirm} disabled={loading}>
            {loading ? <><SpinnerInline /> Processing...</> : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}