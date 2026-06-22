import React from "react";
import { Panel } from "../components/common/Panel";
import { Table } from "../components/common/Table";
import { Pagination } from "../components/common/Pagination";
import { EmptyState } from "../components/common/EmptyState";
import { label, dateText } from "../utils/helpers";
export function Requests({ page, onPageChange, me, approve, reject, openDetails }) {
  const isAdmin = me.role === "ADMIN";
  if (page.content.length === 0) {
    return (
      <Panel title="Borrow Requests">
        <EmptyState
          icon="ClipboardCheck"
          title="No requests yet"
          message="When someone wants to borrow your books, or when you request a book, they will appear here."
        />
      </Panel>
    );
  }
  return (
    <Panel title="Borrow Requests" >
      <Table headers={["Book", "Borrower", "Owner", "Status", "Requested", "Actions"]}>
        {page.content.map((row) => (
          <tr key={row.id}>
            <td><strong>{row.book.title}</strong><br /><span>{row.book.author}</span></td>
            <td>{row.requester.fullName}</td>
            <td>{row.owner.fullName}</td>
            <td><span className={`chip ${row.status}`}>{label(row.status)}</span></td>
            <td>{dateText(row.requestedAt)}</td>
            <td><div className="row-actions">
              {(row.owner.id === me.id || isAdmin) && row.status === "pending" && <><button className="btn primary" onClick={() => approve(row.id)}>Approve</button><button className="btn danger" onClick={() => reject(row.id)}>Reject</button></>}
              <button className="btn" onClick={() => openDetails(row.book)}>Book</button>
            </div></td>
          </tr>
        ))}
      </Table>
      <Pagination page={page.page} totalPages={page.totalPages} totalElements={page.totalElements} onPageChange={onPageChange} />
    </Panel>
  );
}