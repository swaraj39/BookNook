import React, { useState } from "react";
import { Panel } from "../components/common/Panel";
import { Table } from "../components/common/Table";
import { Pagination } from "../components/common/Pagination";
import { EmptyState } from "../components/common/EmptyState";
import { RefreshButton } from "../components/common/RefreshButton";
import { label, toBookForm, dateText } from "../utils/helpers";

function SpinnerInline() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: "btn-spin 0.7s linear infinite", flexShrink: 0 }}>
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

function ReturnButton({ loan, returnBook }) {
  const [loading, setLoading] = useState(false);
  async function handle() {
    setLoading(true);
    try { await returnBook(loan.id, loan.book.title); } finally { setLoading(false); }
  }
  return (
    <button className="btn warn" onClick={handle} disabled={loading}>
      {loading ? <><SpinnerInline /> Returning...</> : "Return"}
    </button>
  );
}

export function MyLibrary({ myBooksPage, onMyBooksPageChange, borrowedPage, onBorrowedPageChange, setBookModal, deleteBook, returnBook, openDetails, onRefreshShelf, onRefreshReading }) {
  const [tab, setTab] = useState("shelf");
  const refreshFn = tab === "shelf" ? onRefreshShelf : onRefreshReading;

  return (
    <Panel
      title={tab === "shelf" ? "My Shelf" : "Currently Reading"}
      actions={refreshFn && (
        <RefreshButton
          onRefresh={refreshFn}
          title={`Refresh ${tab === "shelf" ? "shelf" : "borrow status"}`}
        />
      )}
    >
      <div className="my-library-toggle-row">
        <div className="my-library-toggle">
          <button
            className={`filter-btn ${tab === "shelf" ? "active" : ""}`}
            onClick={() => setTab("shelf")}
          >
            My Shelf
          </button>
          <button
            className={`filter-btn ${tab === "reading" ? "active" : ""}`}
            onClick={() => setTab("reading")}
          >
            Currently Reading
          </button>
        </div>
      </div>
      {tab === "shelf" ? (
        myBooksPage.content.length === 0 ? (
          <EmptyState
            icon="BookPlus"
            title="Your library is empty"
            message="You haven't shared any books with the community yet. Start by adding your first book!"
            actionLabel="Add your first book"
            onAction={() => setBookModal({ title: "", author: "", genreId: "", condition: "good", exchangeLocation: "", defaultLoanDays: 14, description: "" })}
          />
        ) : (
          <>
            <Table headers={["Book", "Genre", "Status", "Actions"]}>
              {myBooksPage.content.map((book) => (
                <tr key={book.id}>
                  <td><strong>{book.title}</strong><br />{book.author}</td>
                  <td>{book.genre?.name}</td>
                  <td><span className={`chip ${book.availabilityStatus}`}>{label(book.availabilityStatus)}</span></td>
                  <td><div className="row-actions">
                    {book.availabilityStatus !== "borrowed" && (
                      <>
                        <button className="btn" onClick={() => setBookModal(toBookForm(book))}>Edit</button>
                        <button className="btn danger" onClick={() => deleteBook(book.id)}>Delete</button>
                      </>
                    )}
                    <button className="btn" onClick={() => openDetails(book)}>View Book</button>
                  </div></td>
                </tr>
              ))}
            </Table>
            {myBooksPage.totalPages > 1 && (
              <Pagination page={myBooksPage.page} totalPages={myBooksPage.totalPages} totalElements={myBooksPage.totalElements} onPageChange={onMyBooksPageChange} />
            )}
          </>
        )
      ) : (
        borrowedPage.content.length === 0 ? (
          <EmptyState
            icon="LibraryBig"
            title="No active reads"
            message="You aren't currently reading any books from the community. Browse the catalog to find your next great read!"
          />
        ) : (
          <>
            <Table headers={["Book", "Owner", "Borrowed", "Due", "Status", "Actions"]}>
              {borrowedPage.content.map((loan) => (
                <tr key={loan.id}>
                  <td><strong>{loan.book.title}</strong><br />{loan.book.author}</td>
                  <td>{loan.owner.fullName}</td>
                  <td>{dateText(loan.borrowedAt)}</td>
                  <td>{dateText(loan.dueAt)}</td>
                  <td><span className={`chip ${loan.status}`}>{label(loan.status)}</span></td>
                  <td><div className="row-actions"><ReturnButton loan={loan} returnBook={returnBook} />
                    <button className="btn" onClick={() => openDetails(loan.book)}>Details</button></div></td>
                </tr>
              ))}
            </Table>
            {borrowedPage.totalPages > 1 && (
              <Pagination page={borrowedPage.page} totalPages={borrowedPage.totalPages} totalElements={borrowedPage.totalElements} onPageChange={onBorrowedPageChange} />
            )}
          </>
        )
      )}
    </Panel>
  );
}
