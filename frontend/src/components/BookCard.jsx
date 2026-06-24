import React, { useState } from "react";
import { label, dateText } from "../utils/helpers";

function SpinnerInline() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: "btn-spin 0.7s linear infinite", flexShrink: 0 }}>
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

export function BookCard({ book, me, openDetails, setRequestModal, setBookModal, returnBook }) {
  const isAdmin = me.role === "ADMIN";
  const ownedByMe = book.owner.id === me.id;
  const borrowedByMe = book.activeLoanId && book.activeLoanBorrowerId === me.id;
  const [returning, setReturning] = useState(false);

  async function handleReturn(e) {
    e.stopPropagation();
    setReturning(true);
    try { await returnBook(book.activeLoanId, book.title); } finally { setReturning(false); }
  }

  return (
    <article
      className={`book-card book-card-clickable ${isAdmin ? "admin-border" : ""} ${book.availabilityStatus === "borrowed" ? "status-borrowed" : ""}`}
      onClick={() => openDetails(book)}
    >
      <div className="cover">
        <div className="cover-art" style={{ background: book.coverColor || "#16756f" }}>
          {book.coverUrl ? <img src={book.coverUrl} alt={book.title} /> : book.genre?.name}
        </div>
        <div>
          <div className="flex-between">
            <h3>{book.title}</h3>
            
          </div>
          <div className="author">{book.author}</div>
          <div className="chips">
            <span className={`chip ${book.availabilityStatus}`}>{label(book.availabilityStatus)}</span>
            {borrowedByMe && <span className="chip returned">Borrowed by you</span>}
          </div>
        </div>
      </div>
      <div className="book-body">
        <div className="mini-meta">
          <span><strong>Owner:</strong> {book.owner.fullName}</span>
          <span><strong>Genre:</strong> {book.genre?.name || "N/A"}</span>
          <span><strong>Condition:</strong> {book.condition?.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
          <span><strong>Reading Duration:</strong> {book.defaultLoanDays} days</span>
          {book.dueAt && <span><strong>Due Date:</strong> {dateText(book.dueAt)}</span>}
        </div>
        <div className="card-actions" onClick={(e) => e.stopPropagation()}>
          {!ownedByMe && book.availabilityStatus === "available" && (
            <button className="btn primary" onClick={() => setRequestModal(book)}>Request</button>
          )}
          {borrowedByMe && (
            <button className="btn warn" onClick={handleReturn} disabled={returning}>
              {returning ? <><SpinnerInline /> Returning...</> : "Return"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function toBookForm(book) {
  return { ...book, genreId: book.genre?.id };
}