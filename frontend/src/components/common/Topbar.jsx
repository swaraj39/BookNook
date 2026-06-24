import React from "react";

export function Topbar({ title, description, button, children }) {
  return (
    <section className="topbar">
      <div className="page-title">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div>
        {button}
        {children}
      </div>
    </section>
  );
}