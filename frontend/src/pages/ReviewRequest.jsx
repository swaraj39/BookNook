import React, { useEffect, useState } from "react";
import {
  Check,
  X,
  LayoutDashboard,
  Hourglass,
  User,
  CalendarDays,
  Calendar,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { api } from "../api";
import { dateText, initials } from "../utils/helpers";

function SpinnerInline() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: "btn-spin 0.7s linear infinite", flexShrink: 0 }}>
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

export function ReviewRequest({ token, onDone, notify }) {
  const [state, setState] = useState("loading");
  const [message, setMessage] = useState("");
  const [request, setRequest] = useState(null);
  const [acting, setActing] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await api.reviewRequest(token);
        if (cancelled) return;
        setRequest(result);
        setState("ready");
      } catch (err) {
        if (cancelled) return;
        const msg = err.message || "This review link isn't valid.";
        setMessage(msg);
        setState(
          msg.toLowerCase().includes("already")
            ? "handled"
            : msg.toLowerCase().includes("expired")
              ? "expired"
              : "error"
        );
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  async function act(action) {
    setActing(action);
    setMessage("");
    try {
      if (action === "approve") {
        await api.approve(request.id);
        notify?.("Request approved and loan started.");
      } else {
        await api.reject(request.id);
        notify?.("Request rejected.");
      }
      onDone();
    } catch (err) {
      setMessage(err.message || "Something went wrong. Please try again.");
      setActing(null);
    }
  }

  if (state === "loading") {
    return (
      <div className="review-page">
        <div className="review-card review-card-loading">
          <div className="verify-spinner" />
          <p>Loading request...</p>
        </div>
      </div>
    );
  }

  if (state === "handled" || state === "error" || state === "expired") {
    const terminal = {
      handled: { Icon: CheckCircle2, title: "Request Handled" },
      expired: { Icon: Clock, title: "Link Expired" },
      error: { Icon: AlertCircle, title: "Link Unavailable" },
    }[state];
    const Icon = terminal.Icon;
    return (
      <div className="review-page">
        <div className="review-card review-card-state">
          <div className={`review-state-icon review-state-icon--${state}`}>
            <Icon size={28} strokeWidth={2.2} />
          </div>
          <h2 className="review-title review-title-state">{terminal.title}</h2>
          <p className="review-state-message">{message}</p>
          <button className="btn primary review-state-btn" onClick={onDone}>
            <LayoutDashboard size={15} /> Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="review-page">
      <div className="review-card">
        <header className="review-head">
          <div className="review-pill">
            <Hourglass size={12} />
            <span>Pending Borrow Request</span>
          </div>
          <h1 className="review-title hero-gradient">Review Borrow Request</h1>
          <p className="review-sub">Someone wants to borrow a book from your shelf.</p>
        </header>

        <section className="review-book">
          <div className="cover-art review-cover" style={{ background: request.book.coverColor || "#16756f" }}>
            {request.book.coverUrl ? (
              <img src={request.book.coverUrl} alt={request.book.title} />
            ) : (
              request.book.title
            )}
          </div>
          <div className="review-book-info">
            <h2 className="review-book-title">{request.book.title}</h2>
            <div className="review-book-author">{request.book.author}</div>
          </div>
        </section>

        <section className="review-details">
          <h3 className="review-section-label">Request Details</h3>
          <div className="review-detail-grid">
            <div className="review-detail">
              <span className="review-avatar" aria-hidden="true">{initials(request.requester.fullName)}</span>
              <div className="review-detail-text">
                <strong className="review-detail-value">{request.requester.fullName}</strong>
                <span className="review-detail-label">Borrower</span>
              </div>
            </div>
            <div className="review-detail">
              <span className="review-detail-icon" aria-hidden="true"><CalendarDays size={15} /></span>
              <div className="review-detail-text">
                <strong className="review-detail-value">
                  {request.requestedLoanDays} <span className="review-detail-unit">days</span>
                </strong>
                <span className="review-detail-label">Loan period</span>
              </div>
            </div>
            <div className="review-detail">
              <span className="review-detail-icon" aria-hidden="true"><Calendar size={15} /></span>
              <div className="review-detail-text">
                <strong className="review-detail-value">{dateText(request.requestedAt)}</strong>
                <span className="review-detail-label">Requested</span>
              </div>
            </div>
          </div>
        </section>

        {request.borrowerNote && (
          <section className="review-note">
            <div className="review-note-head">
              <MessageSquare size={14} />
              <span>Message from {request.requester.fullName}</span>
            </div>
            <p className="review-note-text">“{request.borrowerNote}”</p>
          </section>
        )}

        {message && <div className="review-error">{message}</div>}

        <footer className="review-actions">
          <p className="review-prompt">
            Ready to lend this book for {request.requestedLoanDays} {request.requestedLoanDays === 1 ? "day" : "days"}?
          </p>
          <div className="review-actions-buttons">
            <button className="btn danger review-reject" onClick={() => act("reject")} disabled={!!acting}>
              {acting === "reject" ? <><SpinnerInline /> Rejecting...</> : <><X size={15} /> Reject</>}
            </button>
            <button className="btn primary review-approve" onClick={() => act("approve")} disabled={!!acting}>
              {acting === "approve" ? <><SpinnerInline /> Approving...</> : <><Check size={15} /> Approve</>}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}