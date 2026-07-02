// src/pages/Dashboard.jsx
import React from "react";
import { label, dateText } from "../utils/helpers";
import { BookOpen, Calendar, Milestone, Sparkles, Tv } from "lucide-react";

export function Dashboard({ stats, me, dailyThought, openDetails }) {
  // Hardcoded array of informative learning clips / music streams for readers
  const videoLinks = [
    "https://www.youtube.com/embed/AUw7laSlcbo?si=0lZXz_XqWHQrkd6x" // YouTube Embedded Players Demo
  ];

  // Deterministically select video item for the user matching array bounds
  const getSelectedVideo = () => {
    if (!me?.id) return videoLinks[0];
    const code = me.id.charCodeAt(0) || 0;
    return videoLinks[code % videoLinks.length];
  };

  const chartMax = Math.max(...(stats.chartData || []).map(d => Math.max(d.userCount, d.globalAvg, 4)), 1);

  return (
    <div className="dashboard-layout">
      {/* Welcome Banner Row */}
      <header className="dashboard-welcome-banner">
        <div className="welcome-message-node">
          <h1>Welcome, {me?.fullName || "Reader"}</h1>
          <p>Ready to look into another story tier today?</p>
        </div>

        {dailyThought && (
          <div className="dashboard-quote-panel">
            <div className="quote-badge">
              <Sparkles size={14} />
              <span>Thought of the Day</span>
            </div>
            <blockquote>"{dailyThought.q}"</blockquote>
            <cite>— {dailyThought.author || dailyThought.by || dailyThought.a}</cite>
          </div>
        )}
      </header>

      {/* Main Analytics Row Block Section */}
      <section className="analytics-block-grid">
        <div className="stats-cards-quad">
          <article className="metrics-pill-card">
            <label>Available Books</label>
            <strong>{stats?.totalBooks || 0}</strong>
          </article>

          <article className="metrics-pill-card">
            <label>Books Reading</label>
            <strong>{stats?.activeBorrowed || 0}</strong>
          </article>

          <article className="metrics-pill-card">
            <label>Books Read This Month</label>
            <strong>{stats?.booksReadThisMonth || 0}</strong>
          </article>

          <article className="metrics-pill-card">
            <label>Total Books Read</label>
            <strong>{stats?.totalBooksRead || 0}</strong>
          </article>
        </div>

        {/* 1/4 Screen Month-by-Month CSS Flex Bar Graph Rendering */}
        <div className="analytics-graph-container">
          <h4>Reading Frequency Matrix</h4>
          <p className="graph-sub">Your monthly velocity vs team average (dashed line)</p>
          <div className="bar-graph-view-port">
            {stats.chartData?.map((dataPoint, idx) => {
              const userPct = (dataPoint.userCount / chartMax) * 100;
              const globalPct = (dataPoint.globalAvg / chartMax) * 100;
              return (
                <div key={idx} className="graph-column-strip">
                  <div className="bar-track-container">
                    <div className="user-count-fill-bar" style={{ height: `${userPct}%` }}>
                      <span className="bar-floating-lbl">{dataPoint.userCount}</span>
                    </div>
                    <div className="global-avg-dot-marker" style={{ bottom: `${globalPct}%` }} title={`Team Avg: ${dataPoint.globalAvg}`} />
                  </div>
                  <span className="column-month-lbl">{dataPoint.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom Layout Row split split */}
      <section className="dashboard-split-feed-row">
        {/* 3/5 Screen Scrollable Latest Activity Feed */}
        <div className="latest-readings-scroller-box">
          <div className="feed-title-header">
            <BookOpen size={18} />
            <h3>Your Latest Reading Logs</h3>
          </div>
          <div className="history-scroll-viewport">
            {stats.latestReadings && stats.latestReadings.filter((log) => log.status !== "rejected").length > 0 ? (
              stats.latestReadings
                .filter((log) => log.status !== "rejected")
                .map((log) => (
                  <div key={log.id} className="reading-log-item-strip" onClick={() => openDetails(log.book)}>
                    <div className="log-book-thumbnail" style={{ backgroundColor: log.book.coverColor || "var(--brand)" }}>
                      {log.book.coverUrl ? <img src={log.book.coverUrl} alt={log.book.title} /> : log.book.title[0]}
                    </div>
                    <div className="log-book-details">
                      <h4>{log.book.title}</h4>
                      <p className="author-lbl">{log.book.author} · <span className="genre-tag-inline">{log.book.genreName}</span></p>
                      <div className="timeline-meta-chips">
                        <span className={`chip-status-lbl ${log.status}`}>{label(log.status)}</span>
                        <span className="date-marker-lbl">Requested: {dateText(log.requestedAt)}</span>
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="empty-logs-placeholder">
                <Milestone size={32} />
                <p>No active transaction history logs discovered on your account shelf yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* 2/5 Screen Multimedia Column Block Stack */}
        <div className="media-column-stack-block">
          {/* Top Half Media Stream Embed Box */}
          <div className="video-player-media-panel">
            <div className="feed-title-header">
              <Tv size={16} />
              <h3>Community Spotlight Stream</h3>
            </div>
            <div className="iframe-video-wrapper">
              <div className="iframe-video-wrapper">
                <iframe
                  width="100%"
                  height="100%"
                  src={getSelectedVideo()}
                  title="Book Nook Streaming Hub"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>

          {/* Bottom Half Seeded Book of the Day Panel */}
          <div className="book-of-the-day-showcase-panel">
            <div className="feed-title-header">
              <Calendar size={16} />
              <h3>Book of the Day</h3>
            </div>
            {stats.bookOfTheDay ? (
              <div className="showcase-content-box" onClick={() => openDetails(stats.bookOfTheDay)}>
                <div className="showcase-cover-card" style={{ backgroundColor: stats.bookOfTheDay.coverColor || "var(--brand-dark)" }}>
                  {stats.bookOfTheDay.coverUrl ? <img src={stats.bookOfTheDay.coverUrl} alt={stats.bookOfTheDay.title} /> : stats.bookOfTheDay.title[0]}
                </div>
                <div className="showcase-text-summary">
                  <h4>{stats.bookOfTheDay.title}</h4>
                  <p className="author">{stats.bookOfTheDay.author}</p>
                  <span className="badge-owner-tag">Lender: {stats.bookOfTheDay.ownerName}</span>
                  {stats.bookOfTheDay.description && (
                    <p className="clamped-desc-snippet">{stats.bookOfTheDay.description}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="empty-logs-placeholder">No active catalog items listed to choose from today.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}