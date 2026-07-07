import React from "react";
import { Panel } from "../components/common/Panel";
import { Table } from "../components/common/Table";
import { Pagination } from "../components/common/Pagination";
import { EmptyState } from "../components/common/EmptyState";
import { RefreshButton } from "../components/common/RefreshButton";
import { label, toBookForm } from "../utils/helpers";

export function MyBooks({ page, onPageChange, setBookModal, deleteBook, openDetails, onRefresh }) {
  if (page.content.length === 0) {
    return (
      <Panel title="My Shelf" actions={onRefresh && <RefreshButton onRefresh={() => onRefresh(page.page)} title="Refresh my shelf" />}>
        <EmptyState
          icon="BookPlus"
          title="Your library is empty"
          message="You haven't shared any books with the community yet. Start by adding your first book!"
          actionLabel="Add your first book"
          onAction={() => setBookModal({ title: "", author: "", genreId: "", condition: "good", exchangeLocation: "", defaultLoanDays: 14, description: "" })}
        />
      </Panel>
    );
  }

  return (
    <Panel title="My Shelf" actions={onRefresh && <RefreshButton onRefresh={() => onRefresh(page.page)} title="Refresh my shelf" />}>
      <div className="table-responsive-wrapper">
        <Table headers={["Book", "Genre", "Status", "Actions"]}>
          {page.content.map((book) => (
            // Change this line in MyBooks.js
            <tr key={book.id} className={`shelf-row ${book.availabilityStatus?.toLowerCase()}`}>
              <td data-label="Book">
                <div className="book-info-compact" onClick={() => openDetails(book)}>
                  <strong>{book.title}</strong>
                  <span>{book.author}</span>
                </div>
              </td>
              <td data-label="Genre">{book.genre?.name || "-"}</td>
              <td data-label="Status">
                <span className={`chip ${book.availabilityStatus?.toLowerCase()}`}>{label(book.availabilityStatus)}</span>
              </td>
              <td data-label="Actions">
                <div className="row-actions">
                  {book.availabilityStatus !== 'borrowed' && (
                    <>
                      <button className="btn" onClick={() => setBookModal(toBookForm(book))}>Edit</button>
                      <button className="btn danger" onClick={() => deleteBook(book.id)}>Delete</button>
                    </>
                  )}
                  <button className="btn" onClick={() => openDetails(book)}>View</button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </div>

      <div className="two-block-pagination">
        {page.totalPages > 1 && (
          <Pagination
            page={page.page}
            totalPages={page.totalPages}
            totalElements={page.totalElements}
            onPageChange={onPageChange}
          />
        )}
      </div>
    </Panel>
  );
}