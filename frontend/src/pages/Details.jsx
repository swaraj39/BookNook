import React, { useState } from "react";
import { label, dateText, toBookForm } from "../utils/helpers";
import { Pagination } from "../components/common/Pagination";

function SpinnerInline() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: "btn-spin 0.7s linear infinite", flexShrink: 0 }}>
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}
function ReturnButtonDetails({ book, returnBook }) {
  const [loading, setLoading] = useState(false);
  async function handle() {
    setLoading(true);
    try { await returnBook(book.activeLoanId, book.title); } finally { setLoading(false); }
  }
  return (
    <button className="btn warn" onClick={handle} disabled={loading}>
      {loading ? <><SpinnerInline /> Returning...</> : "Return this book"}
    </button>
  );
}

export function Details({ book, historyPage, onPageChange, me, setView, setBookModal, setRequestModal, returnBook }) {
  const isAdmin = me.role === "ADMIN";
  const ownedByMe = book.owner.id === me.id;
  const borrowedByMe = book.activeLoanId && book.activeLoanBorrowerId === me.id;
  const [navigating, setNavigating] = useState(false);

  async function handleBack() {
    setNavigating(true);
    await new Promise((res) => setTimeout(res, 400));
    setView("catalog");
  }

  if (navigating) {
    return (
      <div className="details-loader-overlay">
        <div className="details-loader-box">
          <svg className="details-loader-spinner" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          <span>Going back to browse...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-layout">
      <div className="detail-cover">
        <div className="detail-book" style={{ background: book.coverColor || "#17313b" }}>
          {book.coverUrl ? (
            <img src={book.coverUrl} alt={book.title} />
          ) : (
            book.title
          )}
        </div>
      </div>
      <div className="panel detail-panel">
        <div className="flex-between">
          <button className="btn" onClick={handleBack}>Back to browse</button>
          {isAdmin && <span className="admin-badge">Admin Mode</span>}
        </div>
        <h3>{book.title}</h3>
        <div className="author">{book.author}</div>
        <div className="chips">
          <span className={`chip ${book.availabilityStatus}`}>{label(book.availabilityStatus)}</span>
          
        </div>
        <p>{book.description}</p>
       <div className="mini-meta">
  <span>
    <strong>Owner:</strong> {book.owner.fullName}
  </span>

  <span>
    <strong>Genre:</strong> {book.genre?.name || "N/A"}
  </span>

  <span>
    <strong>Condition:</strong>{" "}
    {book.condition
      ?.replace("_", " ")
      .replace(/\b\w/g, c => c.toUpperCase())}
  </span>

  <span>
    <strong>Reading Duration:</strong> {book.defaultLoanDays} days
  </span>

  {book.dueAt && (
    <span>
      <strong>Due Date:</strong> {dateText(book.dueAt)}
    </span>
  )}
</div>
        <div className="card-actions detail-actions">
          {!ownedByMe && book.availabilityStatus === "available" && <button className="btn primary" onClick={() => setRequestModal(book)}>Request the book</button>}
          {borrowedByMe && <ReturnButtonDetails book={book} returnBook={returnBook} />}
          {(ownedByMe || isAdmin) && <button className="btn" onClick={() => setBookModal(toBookForm(book))}>Edit book</button>}
        </div>
        {/* <div className="timeline">
          <h3>Activity</h3>
          {historyPage.content.length === 0 && <div className="timeline-item">No borrowing activity yet.</div>}
          {historyPage.content.map((item) => <div className="timeline-item" key={item.id}><strong>{item.title}</strong><span>{dateText(item.createdAt)}</span><br /><span>{item.message}</span></div>)}
          <Pagination page={historyPage.page} totalPages={historyPage.totalPages} totalElements={historyPage.totalElements} onPageChange={onPageChange} />
        </div> */}
      </div>
    </div>
  );
}