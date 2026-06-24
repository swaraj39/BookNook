import React, { useState } from "react";
import { Panel } from "../components/common/Panel";
import { Table } from "../components/common/Table";
import { Pagination } from "../components/common/Pagination";
import { EmptyState } from "../components/common/EmptyState";
import { label, dateText } from "../utils/helpers";

function SpinnerInline() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: "btn-spin 0.7s linear infinite", flexShrink: 0 }}>
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

function RequestRow({ row, me, isAdmin, approve, reject, openDetails }) {
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  async function handleApprove(id) {
    setApprovingId(id);
    try { await approve(id); } finally { setApprovingId(null); }
  }

  async function handleReject(id) {
    setRejectingId(id);
    try { await reject(id); } finally { setRejectingId(null); }
  }

  const isApproving = approvingId === row.id;
  const isRejecting = rejectingId === row.id;
  const busy = isApproving || isRejecting;

  return (
    <tr key={row.id}>
      <td><strong>{row.book.title}</strong><br /><span>{row.book.author}</span></td>
      <td>{row.requester.fullName}</td>
      <td>{row.owner.fullName}</td>
      <td>
        <span className={`chip ${row.status}`}>
          {row.status === "converted_to_loan" ? "Reading" : label(row.status)}
        </span>
      </td>
      <td>{dateText(row.requestedAt)}</td>
      <td>
        <div className="row-actions">
          {(row.owner.id === me.id || isAdmin) && row.status === "pending" && (
            <>
              <button className="btn approve" onClick={() => handleApprove(row.id)} disabled={busy}>
                {isApproving ? <><SpinnerInline /> Approving...</> : "Approve"}
              </button>
              <button className="btn danger" onClick={() => handleReject(row.id)} disabled={busy}>
                {isRejecting ? <><SpinnerInline /> Rejecting...</> : "Reject"}
              </button>
            </>
          )}
          <button className="btn" onClick={() => openDetails(row.book)}>Book</button>
        </div>
      </td>
    </tr>
  );
}

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
    <div className="request-container">
      <Panel title="Borrow Requests">
        <Table headers={["Book", "Borrower", "Owner", "Status", "Requested", "Actions"]}>
          {page.content.map((row) => (
            <RequestRow key={row.id} row={row} me={me} isAdmin={isAdmin} approve={approve} reject={reject} openDetails={openDetails} />
          ))}
        </Table>
        {page.totalPages > 1 && (
          <Pagination page={page.page} totalPages={page.totalPages} totalElements={page.totalElements} onPageChange={onPageChange} />
        )}
      </Panel>
    </div>
  );
}