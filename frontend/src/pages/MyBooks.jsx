import React from "react";
import { Panel } from "../components/common/Panel";
import { Table } from "../components/common/Table";
import { Pagination } from "../components/common/Pagination";
import { EmptyState } from "../components/common/EmptyState";
import { label, toBookForm } from "../utils/helpers";
export function MyBooks({ page, onPageChange, setBookModal, deleteBook, openDetails }) {
  if (page.content.length === 0) {
    return (
      <Panel title="My Shelf">
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
    <Panel title="My Shelf" >
      <Table headers={["Book", "Genre", "Status", "Actions"]}>
        {page.content.map((book) => (
          <tr key={book.id}>
            <td><strong>{book.title}</strong><br />{book.author}</td>
            <td>{book.genre?.name}</td>
            <td><span className={`chip ${book.availabilityStatus}`}>{label(book.availabilityStatus)}</span></td>
            <td><div className="row-actions">
              <button className="btn" onClick={() => setBookModal(toBookForm(book))}>Edit</button>
              <button className="btn" onClick={() => openDetails(book)}>View</button>
              <button className="btn danger" onClick={() => deleteBook(book.id)}>Delete</button>
            </div></td>
          </tr>
        ))}
      </Table>
      {page.totalPages > 1 && (
        <Pagination page={page.page} totalPages={page.totalPages} totalElements={page.totalElements} onPageChange={onPageChange} />
      )}
    </Panel>
  );
}