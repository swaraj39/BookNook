import React from "react";
import { label, dateText, toBookForm } from "../utils/helpers";
import { Pagination } from "../components/common/Pagination";
export function Details({ book, historyPage, onPageChange, me, setView, setBookModal, setRequestModal, returnBook }) {
  const isAdmin = me.role === "ADMIN";
  const ownedByMe = book.owner.id === me.id;
  const borrowedByMe = book.activeLoanId && book.activeLoanBorrowerId === me.id;
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
          <button className="btn" onClick={() => setView("catalog")}>Back to browse</button>
          {isAdmin && <span className="admin-badge">Admin Mode</span>}
        </div>
        <h3>{book.title}</h3>
        <div className="author">{book.author}</div>
        <div className="chips">
          <span className={`chip ${book.availabilityStatus}`}>{label(book.availabilityStatus)}</span>
          <span className="chip">{book.genre?.name}</span>
          <span className="chip">{label(book.condition)}</span>
        </div>
        <p>{book.description}</p>
        <div className="mini-meta">
          <span><strong>Owner:</strong> {book.owner.fullName}</span>
          <span><strong>Reading duration:</strong> {book.defaultLoanDays} days</span>
          {book.dueAt && <span><strong>Return date:</strong> {dateText(book.dueAt)}</span>}
        </div>
        <div className="card-actions detail-actions">
          {!ownedByMe && book.availabilityStatus === "available" && <button className="btn primary" onClick={() => setRequestModal(book)}>Request this book</button>}
          {borrowedByMe && <button className="btn warn" onClick={() => returnBook(book.activeLoanId)}>Return this book</button>}
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