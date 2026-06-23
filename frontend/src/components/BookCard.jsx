import React from "react";
import { label, dateText } from "../utils/helpers";
export function BookCard({ book, me, openDetails, setRequestModal, setBookModal, returnBook }) {
  const isAdmin = me.role === "ADMIN";
  const ownedByMe = book.owner.id === me.id;
  const borrowedByMe = book.activeLoanId && book.activeLoanBorrowerId === me.id;
  return (
    <article
      className={`book-card book-card-clickable ${isAdmin ? "admin-border" : ""}`}
      onClick={() => openDetails(book)}
    >
      <div className="cover">
        <div className="cover-art" style={{ background: book.coverColor || "#16756f" }}>
          {book.coverUrl ? (
            <img src={book.coverUrl} alt={book.title} />
          ) : (
            book.genre?.name
          )}
        </div>
        <div>
          <div className="flex-between">
            <h3>{book.title}</h3>
            {isAdmin && <span className="admin-tag">Admin</span>}
          </div>
          <div className="author">{book.author}</div>
          <div className="$chips">
            <span className={`chip ${book.availabilityStatus}`}>{label(book.availabilityStatus)}</span>

            {borrowedByMe && <span className="chip returned">Borrowed by you</span>}
          </div>
        </div>
      </div>
      <div className="book-body">
        {/* <><p>{""}</p></> */}
        {/* <p className="book-desc">{book.description}</p> */}
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
        <div className="card-actions" onClick={(e) => e.stopPropagation()}>
          {!ownedByMe && book.availabilityStatus === "available" && <button className="btn primary" onClick={() => setRequestModal(book)}>Request</button>}
          {borrowedByMe && <button className="btn warn" onClick={() => returnBook(book.activeLoanId, book.title)}>Return</button>}
        </div>
      </div>
    </article>
  );
}
function toBookForm(book) {
  return { ...book, genreId: book.genre?.id };
}