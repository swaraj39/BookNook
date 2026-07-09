import React, { useState } from "react";
import { label, dateText } from "../utils/helpers";
import { BookOpen, Milestone, Sparkles, Trophy, ExternalLink, Crown, Feather } from "lucide-react";

export function Dashboard({ stats, me, dailyThought, openDetails, onNavigate }) {
  const [showLeaderboardPopup, setShowLeaderboardPopup] = useState(false);
  const [allLeaderboard, setAllLeaderboard] = useState(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const FEATHER_SIZE = { 1: 18, 2: 15, 3: 14 };
  const LAUREL_SIZE = { 1: 60, 2: 46, 3: 40 };
  const chartMax = Math.max(...(stats.chartData || []).map(d => Math.max(d.userCount, d.globalAvg, 4)), 1);

  async function handleOpenPopup() {
    if (allLeaderboard) {
      setShowLeaderboardPopup(true);
      return;
    }
    setLoadingLeaderboard(true);
    setShowLeaderboardPopup(true);
    try {
      const { api } = await import("../api");
      const data = await api.leaderboard();
      setAllLeaderboard(data);
    } catch {
      setAllLeaderboard([]);
    } finally {
      setLoadingLeaderboard(false);
    }
  }
  function handleClosePopup() {
    setShowLeaderboardPopup(false);
  }

  function booksLabel(count) {
    return `${count} book${count !== 1 ? "s" : ""}`;
  }

  function PodiumStandee({ entry, position }) {
  if (!entry) return <div className={`podium-column pos-${position}`} />;
  return (
    <div className={`podium-column pos-${position}`}>
      <div className="podium-avatar-wrap">
        <div className="podium-laurel-wrap">
          <Laurel size={LAUREL_SIZE[position]} className="podium-laurel podium-laurel-left" />
          <Laurel size={LAUREL_SIZE[position]} className="podium-laurel podium-laurel-right" />
        </div>
        {position === 1 && <Crown size={20} className="podium-crown" />}
        <div
          className="podium-avatar"
          style={{ backgroundColor: entry.avatarUrl ? "transparent" : "var(--brand)" }}
        >
          {entry.avatarUrl ? (
            <img src={entry.avatarUrl} alt={entry.fullName} />
          ) : (
            entry.avatarInitials || entry.fullName?.[0] || "?"
          )}
        </div>
        <span className="podium-rank-chip">{position}</span>
      </div>
      <span className="podium-name">{(entry.fullName || "Unknown").split(" ")[0]}</span>
      <span className="podium-count-big">{booksLabel(entry.booksRead)}</span>
      <div className={`pedestal pedestal-${position}`}>{position}</div>
    </div>
  );
}
function Laurel({ size = 40, className, style }) {
  return (
    <svg
      width={size}
      height={size * 1.7}
      viewBox="0 0 60 100"
      fill="none"
      className={className}
      style={style}
    >
      <path
        d="M32 98 C10 88, 2 62, 6 40 C9 24, 18 10, 30 2"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M28 8 C24 4, 16 3, 12 8 C16 11, 24 12, 28 8Z" fill="currentColor" transform="rotate(20 20 8)" />
      <path d="M24 20 C19 15, 10 14, 6 19 C10 23, 19 24, 24 20Z" fill="currentColor" transform="rotate(15 15 20)" />
      <path d="M19 33 C13 29, 4 29, 0 34 C4 38, 14 38, 19 33Z" fill="currentColor" transform="rotate(8 10 33)" />
      <path d="M15 47 C9 44, 0 45, -3 50 C1 54, 11 53, 15 47Z" fill="currentColor" transform="rotate(0 6 47)" />
      <path d="M13 61 C7 59, -2 61, -5 66 C-1 70, 9 68, 13 61Z" fill="currentColor" transform="rotate(-10 4 61)" />
      <path d="M14 75 C8 74, -1 76, -4 81 C0 84, 10 83, 14 75Z" fill="currentColor" transform="rotate(-20 5 75)" />
      <path d="M19 87 C14 86, 6 89, 3 93 C7 96, 16 94, 19 87Z" fill="currentColor" transform="rotate(-30 11 87)" />
    </svg>
  );
}
  function LeaderboardRow({ entry }) {
    return (
      <div className="leaderboard-row">
        <span className={`leaderboard-rank rank-${entry.rank}`}>{entry.rank}</span>
        <div className="leaderboard-avatar" style={{ backgroundColor: entry.avatarUrl ? "transparent" : "var(--brand)" }}>
          {entry.avatarUrl ? <img src={entry.avatarUrl} alt={entry.fullName} /> : entry.avatarInitials || entry.fullName?.[0] || "?"}
        </div>
        <div className="leaderboard-info">
          <span className="leaderboard-name">{entry.fullName}</span>
        </div>
        <span className="leaderboard-count">{booksLabel(entry.booksRead)}</span>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      { }
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
      { }
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
        { }
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
      { }
      <section className="dashboard-split-feed-row">
        { }
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
        { }
        <div className="leaderboard-panel">
          <div className="leaderboard-header-row">
            <div className="leaderboard-header-left">
              <Trophy size={16} style={{ marginTop: 5 }} />
              <div>
                <h3>Leaderboard</h3>
                <span className="leaderboard-subtitle">Top readers · last 5 months</span>
              </div>
            </div>
            <button className="leaderboard-view-all" onClick={handleOpenPopup}>
              View All <ExternalLink size={14} />
            </button>
          </div>

          <div className="leaderboard-body">
            {stats.leaderboard && stats.leaderboard.length > 0 ? (
              <>
                <div className="leaderboard-hero">
                  <div className="podium-strip">
                    <PodiumStandee entry={stats.leaderboard[1]} position={2} />
                    <PodiumStandee entry={stats.leaderboard[0]} position={1} />
                    <PodiumStandee entry={stats.leaderboard[2]} position={3} />
                  </div>
                </div>
                {stats.leaderboard.slice(3, 5).length > 0 && (
                  <div className="leaderboard-rest">
                    {stats.leaderboard.slice(3, 5).map((entry) => (
                      <LeaderboardRow key={entry.userId} entry={entry} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="empty-logs-placeholder">
                <Milestone size={32} />
                <p>No books have been returned in the last 5 months yet.</p>
              </div>
            )}
          </div>

          { }
          {showLeaderboardPopup && (
            <div className="leaderboard-popup-overlay" onClick={handleClosePopup}>
              <div className="leaderboard-popup" onClick={(e) => e.stopPropagation()}>
                <div className="leaderboard-popup-header">
                  <Trophy size={18} />
                  <h3>Full Leaderboard</h3>
                  <button className="leaderboard-popup-close" onClick={handleClosePopup}>×</button>
                </div>
                <div className="leaderboard-popup-body">
                  {loadingLeaderboard ? (
                    <div className="empty-logs-placeholder"><p>Loading...</p></div>
                  ) : (
                    <div className="leaderboard-rest all-rows">
                      {(allLeaderboard ?? []).map((entry) => (
                        <LeaderboardRow key={entry.userId} entry={entry} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}