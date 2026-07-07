import React, { useState } from "react";
import { Panel } from "../components/common/Panel";
import { Table } from "../components/common/Table";
import { Pagination } from "../components/common/Pagination";
import { EmptyState } from "../components/common/EmptyState";
import { RefreshButton } from "../components/common/RefreshButton";
import { label, dateText } from "../utils/helpers";
import { BookOpen, Check, X, Eye } from "lucide-react";

function SpinnerInline() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "btn-spin 0.7s linear infinite", flexShrink: 0 }}>
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

function RequestRow({ row, me, approve, reject, openDetails }) {
  const [approvingId, setApprovingId] = useState(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  const isMyRequest = row.requester.id === me.id;
  const isReceivedRequest = row.owner.id === me.id;
  const isApproving = approvingId === row.id;
  const isPending = row.status === "pending";

  async function handleApprove() {
    setApprovingId(row.id);
    try {
      await approve(row.id);
    } finally {
      setApprovingId(null);
      setShowApproveConfirm(false);
    }
  }

  return (
    <>
      {/*
        NOTE: `row.status` is now appended to the className alongside the
        incoming/outgoing direction class. The direction class still drives
        the default green/blue border, but the status class (e.g. "rejected",
        "overdue") takes precedence in CSS so a rejected/overdue card always
        renders its red status border regardless of direction.
      */}
      <tr className={`request-row ${isReceivedRequest ? 'incoming' : 'outgoing'} ${row.status}`}>
        <td data-label="Type">
          {isReceivedRequest ? (
            <span className="chip received">Incoming</span>
          ) : (
            <span className="chip mine">Outgoing</span>
          )}
        </td>
        <td data-label="Book" className="book-cell" onClick={() => openDetails(row.book)}>
          <div className="book-info-compact">
            <strong>{row.book.title}</strong>
            <span>{row.book.author}</span>
          </div>
        </td>
        <td data-label="Borrower">{isMyRequest ? "You" : row.requester.fullName}</td>
        <td data-label="Owner">{isReceivedRequest ? "You" : row.owner.fullName}</td>
        <td data-label="Status">
          <span className={`chip ${row.status}`}>
            {row.status === "converted_to_loan" ? "Reading" : label(row.status)}
          </span>
        </td>
        <td data-label="Requested">{dateText(row.requestedAt)}</td>
        <td data-label="Actions">
          <div className="row-actions">
            {isReceivedRequest && isPending && (
              <>
                <button className="btn approve" onClick={() => setShowApproveConfirm(true)} title="Approve Request">
                  <Check size={16} /> <span className="btn-text">Approve</span>
                </button>
                <button className="btn danger" onClick={() => reject(row.id)} title="Reject Request">
                  <X size={16} /> <span className="btn-text">Reject</span>
                </button>
              </>
            )}
            <button className="btn ghost" onClick={() => openDetails(row.book)}>
              <Eye size={16} /> <span className="btn-text">View</span>
            </button>
          </div>
        </td>
      </tr>

      {showApproveConfirm && (
        <div className="modal-backdrop open">
          <div className="modal confirm-modal">
            <div className="modal-head">
              <h3>Approve Request</h3>
            </div>
            <div className="confirm-body">
              <p>Are you sure you want to lend <strong>{row.book.title}</strong> to {row.requester.fullName}?</p>
            </div>
            <div className="modal-foot">
              <button className="btn" disabled={isApproving} onClick={() => setShowApproveConfirm(false)}>Cancel</button>
              <button className="btn approve" disabled={isApproving} onClick={handleApprove}>
                {isApproving ? <SpinnerInline /> : "Yes, Approve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function Requests({ page, onPageChange, me, approve, reject, openDetails, onRefresh }) {
  const [filter, setFilter] = useState("all");

  const filteredContent = page.content.filter((row) => {
    if (filter === "mine") return row.requester.id === me.id;
    if (filter === "owner") return row.owner.id === me.id;
    return true;
  });

  return (
    <div className="request-container">
      <Panel
        title="Borrow Requests"
        actions={onRefresh && <RefreshButton onRefresh={() => onRefresh(page.page)} title="Refresh requests" />}
      >
        <div className="catalog-capsules">
          <button className={`catalog-capsule ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>All Requests</button>
          <button className={`catalog-capsule ${filter === "mine" ? "active" : ""}`} onClick={() => setFilter("mine")}>Sent by Me</button>
          <button className={`catalog-capsule ${filter === "owner" ? "active" : ""}`} onClick={() => setFilter("owner")}>Incoming for My Books</button>
        </div>

        {filteredContent.length === 0 ? (
          <EmptyState
            icon="ClipboardCheck"
            title={filter === "all" ? "No requests yet" : "No matching requests"}
            message="Borrowing activity will appear here."
          />
        ) : (
          <div className="table-responsive-wrapper">
            <Table headers={["Type", "Book", "Borrower", "Owner", "Status", "Requested", "Actions"]}>
              {filteredContent.map((row) => (
                <RequestRow key={row.id} row={row} me={me} approve={approve} reject={reject} openDetails={openDetails} />
              ))}
            </Table>
          </div>
        )}

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
    </div>
  );
}