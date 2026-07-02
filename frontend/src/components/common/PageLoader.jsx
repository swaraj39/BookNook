import React, { useState, useEffect } from "react";

const messages = [
  { text: "Welcome back", icon: "👋" },
  { text: "Preparing your dashboard", icon: "⚙️" },
  { text: "Gathering your reading stats", icon: "📊" },
  { text: "Loading your latest activity", icon: "📚" },
  { text: "Syncing your bookshelf", icon: "🗂️" },
  { text: "Calculating your reading progress", icon: "📈" },
  { text: "Curating today's picks", icon: "✨" },
  { text: "Almost ready", icon: "⏳" },
  { text: "Putting the final touches", icon: "🧩" },
  { text: "Good things take a moment", icon: "🌱" },
  { text: "Thanks for your patience", icon: "🙏" },
  { text: "Just a few seconds more", icon: "⏱️" },
];

export function PageLoader() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, 2000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="nav-loader-overlay">
      <div className="dashboard-loader-spinner-wrap">
        <div className="dashboard-loader-spinner" />
        <span className="dashboard-loader-emoji">{messages[index].icon}</span>
      </div>
      <p key={index} className="dashboard-loader-text">
        {messages[index].text}
      </p>
    </div>
  );
}
