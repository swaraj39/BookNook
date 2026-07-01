import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Panel } from "../components/common/Panel";
import { Table } from "../components/common/Table";
import { Pagination } from "../components/common/Pagination";
import { EmptyState } from "../components/common/EmptyState";
import { label, dateText } from "../utils/helpers";

function SpinnerInline() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: "btn-spin 0.7s linear infinite", flexShrink: 0 }}
    >
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

function RequestRow({ row, me, approve, reject, openDetails }) {
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  const isMyRequest = row.requester.id === me.id;
  const isReceivedRequest = row.owner.id === me.id;

  const isApproving = approvingId === row.id;
  const isRejecting = rejectingId === row.id;
  const busy = isApproving || isRejecting;

  async function handleApprove() {
    setApprovingId(row.id);

    try {
      await approve(row.id);
    } finally {
      setApprovingId(null);
      setShowApproveConfirm(false);
    }
  }

  async function handleReject(id) {
    setRejectingId(id);

    try {
      await reject(id);
    } finally {
      setRejectingId(null);
    }
  }

  return (
    <>
      <tr>
        <td>
          {isReceivedRequest ? (
            <span className="chip received">For My Book</span>
          ) : isMyRequest ? (
            <span className="chip mine">My Request</span>
          ) : (
            <span className="chip">Other</span>
          )}
        </td>

        <td>
          <strong>{row.book.title}</strong>
          <br />
          <span>{row.book.author}</span>
        </td>

        <td>{isMyRequest ? "You" : row.requester.fullName}</td>
        <td>{isReceivedRequest ? "You" : row.owner.fullName}</td>

        <td>
          <span className={`chip ${row.status}`}>
            {row.status === "converted_to_loan" ? "Reading" : label(row.status)}
          </span>
        </td>

        <td>{dateText(row.requestedAt)}</td>

        <td>
          <div className="row-actions">
            {isReceivedRequest && row.status === "pending" && (
              <>
                <button
                  className="btn approve"
                  disabled={busy}
                  onClick={() => setShowApproveConfirm(true)}
                >
                  {isApproving ? (
                    <>
                      <SpinnerInline /> Approving...
                    </>
                  ) : (
                    "Approve"
                  )}
                </button>

                <button
                  className="btn danger"
                  disabled={busy}
                  onClick={() => handleReject(row.id)}
                >
                  {isRejecting ? (
                    <>
                      <SpinnerInline /> Rejecting...
                    </>
                  ) : (
                    "Reject"
                  )}
                </button>
              </>
            )}

            <button className="btn" onClick={() => openDetails(row.book)}>
              Book
            </button>
          </div>
        </td>
      </tr>

      {showApproveConfirm && (
        <div className="custom-confirm-overlay">
          <div className="custom-confirm-modal">
            <h3>Approve Request</h3>

            <p>
              Are you sure you want to approve the request for{" "}
              <strong>{row.book.title}</strong>?
            </p>

            <div className="custom-confirm-actions">
              <button
                className="btn"
                disabled={isApproving}
                onClick={() => setShowApproveConfirm(false)}
              >
                Cancel
              </button>

              <button
                className="btn approve"
                disabled={isApproving}
                onClick={handleApprove}
              >
                {isApproving ? (
                  <>
                    <SpinnerInline /> Approving...
                  </>
                ) : (
                  "Yes, Approve"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function Requests({ page, onPageChange, onRefresh, me, approve, reject, openDetails }) {
  const [filter, setFilter] = useState("all");

  const refreshBtn = (
    <button className="btn icon-only" onClick={onRefresh} title="Refresh" style={{ width: "32px", height: "32px", minHeight: "32px", padding: 0, border: "none", background: "transparent", color: "var(--muted)" }}>
      <RotateCcw size={15} />
    </button>
  );

  const filteredContent = page.content.filter((row) => {
    if (filter === "mine") return row.requester.id === me.id;
    if (filter === "owner") return row.owner.id === me.id;
    return true;
  });

  if (page.content.length === 0) {
    return (
      <Panel title="Borrow Requests" actions={refreshBtn}>
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
      <Panel title="Borrow Requests" actions={refreshBtn}>
        <div className="request-filters">
          <button
            className={`filter-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>

          <button
            className={`filter-btn ${filter === "mine" ? "active" : ""}`}
            onClick={() => setFilter("mine")}
          >
            My Requests
          </button>

          <button
            className={`filter-btn ${filter === "owner" ? "active" : ""}`}
            onClick={() => setFilter("owner")}
          >
            Requests for My Books
          </button>
        </div>

        {filteredContent.length === 0 ? (
          <EmptyState
            icon="ClipboardCheck"
            title="No matching requests"
            message="There are no requests for this selected filter."
          />
        ) : (
          <Table
            headers={[
              "Type",
              "Book",
              "Borrower",
              "Owner",
              "Status",
              "Requested",
              "Actions",
            ]}
          >
            {filteredContent.map((row) => (
              <RequestRow
                key={row.id}
                row={row}
                me={me}
                approve={approve}
                reject={reject}
                openDetails={openDetails}
              />
            ))}
          </Table>
        )}

        {page.totalPages > 1 && (
          <Pagination
            page={page.page}
            totalPages={page.totalPages}
            totalElements={page.totalElements}
            onPageChange={onPageChange}
          />
        )}
      </Panel>
    </div>
  );
}