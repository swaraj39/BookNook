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
export function Details({ book, historyPage, onPageChange, me, navigateBack, navigateTo, setBookModal, setRequestModal, returnBook }) {
  const isAdmin = me.role === "ADMIN";
  const ownedByMe = book.owner.id === me.id;
  const borrowedByMe = book.activeLoanId && book.activeLoanBorrowerId === me.id;
  function handleBackToBrowse() {
    navigateTo("catalog");
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
          <button className="btn" onClick={handleBackToBrowse}>Back to browse</button>
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
      .replace(/\b\base\w/g, c => c.toUpperCase())}
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
        </div>
        {
}
      </div>
    </div>
  );
}