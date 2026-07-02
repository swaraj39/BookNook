import React, { useState, useEffect } from "react";
const dashboardMessages = [
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
export function PageLoader({ isDashboard = false }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!isDashboard) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % dashboardMessages.length);
    }, 2000);
    return () => clearInterval(id);
  }, [isDashboard]);
  if (!isDashboard) {
    return (
      <div className="nav-loader-overlay">
        <div className="dashboard-loader-spinner-wrap">
          <div className="dashboard-loader-spinner" />
        </div>
        <p className="dashboard-loader-text">Loading...</p>
      </div>
    );
  }
  return (
    <div className="nav-loader-overlay">
      <div className="dashboard-loader-spinner-wrap">
        <div className="dashboard-loader-spinner" />
        <span className="dashboard-loader-emoji">{dashboardMessages[index].icon}</span>
      </div>
      <p key={index} className="dashboard-loader-text">
        {dashboardMessages[index].text}
      </p>
    </div>
  );
}