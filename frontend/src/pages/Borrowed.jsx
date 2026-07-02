import React from "react";
import { Panel } from "../components/common/Panel";
import { Table } from "../components/common/Table";
import { Pagination } from "../components/common/Pagination";
import { EmptyState } from "../components/common/EmptyState";
import { RefreshButton } from "../components/common/RefreshButton";
import { label, dateText } from "../utils/helpers";
import { useState } from "react";
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
export function Borrowed({ page, onPageChange, returnBook, openDetails, onRefresh }) {
  if (page.content.length === 0) {
    return (
      <Panel title="Borrow Status" actions={onRefresh && <RefreshButton onRefresh={onRefresh} title="Refresh borrow status" />}>
        <EmptyState
          icon="LibraryBig"
          title="No active reads"
          message="You aren't currently reading any books from the community. Browse the catalog to find your next great read!"
        />
      </Panel>
    );
  }
  return (
    <Panel title="Borrow Status" actions={onRefresh && <RefreshButton onRefresh={onRefresh} title="Refresh borrow status" />}>
      <Table headers={["Book", "Owner", "Borrowed", "Due", "Status", "Actions"]}>
        {page.content.map((loan) => (
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
      {page.totalPages > 1 && (
        <Pagination page={page.page} totalPages={page.totalPages} totalElements={page.totalElements} onPageChange={onPageChange} />
      )}
    </Panel>
  );
}