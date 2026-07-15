import React, { useState, useEffect, useRef } from "react";
import { label, dateText } from "../utils/helpers";
import { BookOpen, Milestone, Sparkles, Trophy, ExternalLink, Crown, Feather } from "lucide-react";

function AnimatedCounter({ value, duration = 800 }) {
  const [count, setCount] = useState(0);
  const frameRef = useRef(null);
  useEffect(() => {
    setCount(0);
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(value * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [value, duration]);
  return <span className="rfc-counter">{count}</span>;
}

function ReadingTooltip({ data, visible }) {
  if (!visible) return null;
  const diff = data.userCount - data.globalAvg;
  const pctAbove = data.globalAvg > 0 ? Math.round((diff / data.globalAvg) * 100) : 0;
  return (
    <div className="rfc-tooltip visible">
      <div className="rfc-tooltip-row"><span>Month</span><span>{data.month}</span></div>
      <div className="rfc-tooltip-row"><span>Books Read</span><strong>{data.userCount}</strong></div>
      <div className="rfc-tooltip-row"><span>Team Avg</span><span>{data.globalAvg}</span></div>
      <div className="rfc-tooltip-divider" />
      <div className={`rfc-tooltip-row ${diff >= 0 ? "positive" : "negative"}`}>
        <span>Difference</span>
        <span>{diff >= 0 ? "+" : ""}{diff}</span>
      </div>
      <div className={`rfc-tooltip-row ${diff >= 0 ? "positive" : "negative"}`}>
        <span>vs Average</span>
        <span>{pctAbove >= 0 ? "+" : ""}{pctAbove}%</span>
      </div>
    </div>
  );
}

function AchievementBadge({ totalBooksRead, aboveAvg }) {
  let badge = null;
  if (totalBooksRead >= 100) badge = { icon: "\uD83C\uDFC5", label: "Century Reader" };
  else if (totalBooksRead >= 50) badge = { icon: "\uD83C\uDFC5", label: "Half Century" };
  else if (totalBooksRead >= 25) badge = { icon: "\u2B50", label: "Silver Reader" };
  else if (totalBooksRead >= 10) badge = { icon: "\u2B50", label: "Bronze Reader" };
  else if (aboveAvg) badge = { icon: "\uD83D\uDCC8", label: "Above Team Avg" };
  if (!badge) return null;
  return (
    <span className="rfc-badge">
      <span className="rfc-badge-icon">{badge.icon}</span>
      {badge.label}
    </span>
  );
}

export function Dashboard({ stats, me, dailyThought, openDetails, onNavigate }) {
  const [showLeaderboardPopup, setShowLeaderboardPopup] = useState(false);
  const [allLeaderboard, setAllLeaderboard] = useState(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const FEATHER_SIZE = { 1: 18, 2: 15, 3: 14 };
  const LAUREL_SIZE = { 1: 60, 2: 46, 3: 40 };
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const isTouchDevice = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  const chartEntry = stats?.chartData?.[0] || {};
  const month = chartEntry.month || "---";
  const booksReadThisMonth = stats?.booksReadThisMonth ?? 0;
  const communityAverageRead = stats?.communityAverageRead ?? 0;
  const totalBooksRead = stats?.totalBooksRead ?? 0;
  const denom = Math.max(booksReadThisMonth, communityAverageRead, 10);
  const pillarPct = Math.min((booksReadThisMonth / denom) * 100, 100);
  const avgPct = Math.min((communityAverageRead / denom) * 100, 100);
  const diff = booksReadThisMonth - communityAverageRead;

  async function handleOpenPopup() {
    if (allLeaderboard) {
      setShowLeaderboardPopup(true);
      return;
    }
    setLoadingLeaderboard(true);
    setShowLeaderboardPopup(true);
    try {
      const { api } = await import("../api");
      const data = await api.leaderboard({ period: "all" });
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
        <div className="reading-frequency-card">
          <div className="rfc-header" style={{ display: "flex", justifyContent: "center" }}>
            <h4>Reading Frequency</h4>
          </div>
          {booksReadThisMonth > 0 ? (
            <div className="rfc-body">
              <div className="rfc-value-display" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <AnimatedCounter value={booksReadThisMonth} />
                <span className="rfc-value-label">Books Read</span>
              </div>
              <div className="rfc-visual-area">
                <div
                  className="rfc-pillar-group"
                  tabIndex={0}
                  role="img"
                  aria-label={`${month}: ${booksReadThisMonth} books read, team average ${communityAverageRead}`}
                  onMouseEnter={() => !isTouchDevice && setTooltipVisible(true)}
                  onMouseLeave={() => !isTouchDevice && setTooltipVisible(false)}
                  onClick={() => setTooltipVisible(v => !v)}
                >
                  <div className="rfc-pillar-track">
                    <div className="rfc-pillar-fill" style={{ height: `${pillarPct}%` }} />
                    <div className="rfc-avg-marker" style={{ bottom: `${avgPct}%` }}>
                      <div className="rfc-avg-line" />
                      <span className="rfc-avg-label">Avg {communityAverageRead}</span>
                    </div>
                  </div>
                  <span className="rfc-month-label">{month}</span>
                  <ReadingTooltip
                    data={{ month, userCount: booksReadThisMonth, globalAvg: communityAverageRead }}
                    visible={tooltipVisible}
                  />
                </div>
              </div>
              <div className="rfc-footer">
                <AchievementBadge totalBooksRead={totalBooksRead} aboveAvg={diff >= 0} />
              </div>
            </div>
          ) : (
            <div className="rfc-empty">
              <div className="rfc-empty-icon">
                <BookOpen size={40} />
              </div>
              <p className="rfc-empty-title">No reading activity yet</p>
              <p className="rfc-empty-sub">Start reading to build your monthly progress.</p>
            </div>
          )}
        </div>
      </section>
      { }
      <section className="dashboard-split-feed-row">
        { }
        <div className="latest-readings-scroller-box">
          <div className="feed-title-header">
            <BookOpen size={18} />
            <h3>Your Latest Reading</h3>
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