import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
// Small self-contained refresh control used on table/list panels. It shows
// its own spinning state while `onRefresh` is in flight and does not touch
// any other part of the page, so clicking it reloads only this one table.
export function RefreshButton({ onRefresh, title = "Refresh" }) {
  const [refreshing, setRefreshing] = useState(false);
  async function handleClick() {
    if (refreshing || !onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <button
      type="button"
      className="btn icon-only"
      onClick={handleClick}
      disabled={refreshing}
      title={title}
      aria-label={title}
    >
      <RotateCcw
        size={16}
        style={refreshing ? { animation: "btn-spin 0.7s linear infinite" } : undefined}
      />
    </button>
  );
}