import React from "react";
import { Panel } from "../components/common/Panel";
import { Table } from "../components/common/Table";
import { Pagination } from "../components/common/Pagination";
import { EmptyState } from "../components/common/EmptyState";
import { label, dateText } from "../utils/helpers";
export function Borrowed({ page, onPageChange, returnBook, openDetails }) {
  if (page.content.length === 0) {
    return (
      <Panel title="Borrow Status">
        <EmptyState
          icon="LibraryBig"
          title="No active reads"
          message="You aren't currently reading any books from the community. Browse the catalog to find your next great read!"
        />
      </Panel>
    );
  }
  return (
    <Panel title="Borrow Status" >
      <Table headers={["Book", "Owner", "Borrowed", "Due", "Status", "Actions"]}>
        {page.content.map((loan) => (
          <tr key={loan.id}>
            <td><strong>{loan.book.title}</strong><br />{loan.book.author}</td>
            <td>{loan.owner.fullName}</td>
            <td>{dateText(loan.borrowedAt)}</td>
            <td>{dateText(loan.dueAt)}</td>
            <td><span className={`chip ${loan.status}`}>{label(loan.status)}</span></td>
            <td><div className="row-actions"><button className="btn warn" onClick={() => returnBook(loan.id, loan.book.title)}>Return</button>

              <button className="btn" onClick={() => openDetails(loan.book)}>Details</button></div></td>
          </tr>
        ))}
      </Table>
      <Pagination page={page.page} totalPages={page.totalPages} totalElements={page.totalElements} onPageChange={onPageChange} />
    </Panel>
  );
}