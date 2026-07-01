import React, { useEffect } from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
export function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onRemove={() => onRemove(toast.id)} />
      ))}
    </div>
  );
}
function Toast({ id, message, type = "success", onRemove }) {
  useEffect(() => {
    const timer = setTimeout(onRemove, 4000);
    return () => clearTimeout(timer);
  }, [onRemove]);
  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info
  }[type] || Info;
  return (
    <div className={`toast-item ${type}`} onClick={onRemove}>
      <Icon size={18} className="toast-icon" />
      <div className="toast-content">{message}</div>
      <button className="toast-close">
        <X size={14} />
      </button>
      <div className="toast-progress" />
    </div>
  );
}