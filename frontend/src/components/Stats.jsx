import React from "react";
import { Stat } from "./common/Stat";

export function Stats({ stats, setView, setFilters }) {
  return (
    // Wrapper that forces centering
    <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
      <section className="stats">
        <Stat
          label="Books on the shelf"
          value={stats.totalBooks}
          onClick={() => {
            setView("catalog");
            setFilters((f) => ({ ...f, availability: "all" }));
          }}
        />
        <Stat
          label="Available to borrow"
          value={stats.availableBooks}
          onClick={() => {
            setView("catalog");
            setFilters((f) => ({ ...f, availability: "available" }));
          }}
        />
        {/* Uncomment when needed
        <Stat
          label="Pending approvals"
          value={stats.pendingRequests}
          onClick={() => setView("requests")}
        />
        <Stat
          label="Currently reading"
          value={stats.activeBorrowed}
          onClick={() => setView("borrowed")}
        /> */}
      </section>
    </div>
  );
}