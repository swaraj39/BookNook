import React from "react";
export function Skeleton({ className, width, height, borderRadius = "4px" }) {
  return (
    <div
      className={`skeleton ${className || ""}`}
      style={{ width, height, borderRadius }}
    />
  );
}
export function BookCardSkeleton() {
  return (
    <div className="book-card skeleton-card">
      <div className="cover">
        <Skeleton width="86px" height="120px" borderRadius="6px" />
        <div style={{ flex: 1 }}>
          <Skeleton width="80%" height="24px" />
          <Skeleton width="40%" height="16px" style={{ marginTop: "8px" }} />
          <div className="chips" style={{ marginTop: "12px" }}>
            <Skeleton width="60px" height="24px" borderRadius="999px" />
            <Skeleton width="60px" height="24px" borderRadius="999px" />
          </div>
        </div>
      </div>
      <div className="book-body">
        <Skeleton width="100%" height="60px" />
        <div className="mini-meta" style={{ marginTop: "12px" }}>
          <Skeleton width="90%" height="14px" />
          <Skeleton width="70%" height="14px" style={{ marginTop: "6px" }} />
        </div>
        <div className="card-actions" style={{ marginTop: "auto" }}>
          <Skeleton width="80px" height="36px" />
          <Skeleton width="80px" height="36px" />
        </div>
      </div>
    </div>
  );
}