import React from "react";

export function BookAddedDialog({ message, onClose }) {
  if (!message) return null;

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Book Added Successfully</h3>
        </div>
        <div className="confirm-body">
          <p>{message}</p>
        </div>
        <div className="modal-foot">
          <button className="btn primary" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
}