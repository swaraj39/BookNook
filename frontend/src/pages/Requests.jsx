import React, { useState, useMemo, useEffect } from "react";
import { Panel } from "../components/common/Panel";
import { EmptyState } from "../components/common/EmptyState";
import { RefreshButton } from "../components/common/RefreshButton";
import { label, dateText } from "../utils/helpers";
import {
  Check, X, Eye, Bell, Ban, RotateCcw, User, XCircle, Plus
} from "lucide-react";
import { color } from "framer-motion";

const COVER_COLORS = [
  "#667FFF", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];

const MAX_VISIBLE = 5;
const COL_COUNT = 4;

function getCoverColor(title = "") {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return COVER_COLORS[Math.abs(hash) % COVER_COLORS.length];
}

function BookThumb({ title, size = 32 }) {
  const words = title ? title.trim().split(/\s+/) : [];
  const letters = words.map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const color = getCoverColor(title);
  return (
    <div
      className="req-book-thumb"
      style={{
        width: size,
        height: Math.round(size * 1.35),
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        fontSize: size * 0.38,
      }}
    >
      <span className="req-book-thumb-letter">{letters || "?"}</span>
    </div>
  );
}

function SpinnerInline() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "btn-spin 0.7s linear infinite", flexShrink: 0 }}>
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

function SectionHeader({ title, isMobile, showViewAll, onViewAll, sectionKey }) {
  return (
    <div className={`section-header ${sectionKey || ""} ${isMobile ? "section-header-mobile" : ""}`}>
      <span className="section-header-title">{title}</span>
      {showViewAll && (
        <button className="view-all-link" onClick={onViewAll}>
          View All
        </button>
      )}
    </div>
  );
}

function ConfirmModal({ action, bookTitle, loading, onConfirm, onCancel }) {
  if (!action) return null;
  const isApprove = action === "approve";
  return (
    <div className="modal-backdrop open" onClick={onCancel}>
      <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{isApprove ? "Approve Request" : "Reject Request"}</h3>
        </div>
        <div className="confirm-body">
          <p>
            Are you sure you want to {action} this request for <strong>{bookTitle}</strong>?
          </p>
        </div>
        <div className="modal-foot">
          <button className="btn" disabled={loading} onClick={onCancel}>Cancel</button>
          <button className={`btn ${isApprove ? "approve" : "danger"}`} disabled={loading} onClick={onConfirm}>
            {loading ? <SpinnerInline /> : "Confirm Action"}
          </button>
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { key: "lending", label: "Requests for My Books" },
  { key: "borrowing", label: "Books I've Requested" },
];

const SECTION_LABELS = {
  lending: {
    section1: "\uD83D\uDCE5 Incoming Requests",
    section2: "\uD83D\uDCE6 Out with Borrowers",
    section3: "\uD83D\uDCDC Past Books Lent",
  },
  borrowing: {
    section1: "\uD83D\uDCE4 Sent Requests",
    section2: "\uD83D\uDCD6 Reading Right Now",
    section3: "\uD83D\uDCDC Past Books Borrowed",
  },
};

export function Requests({ page, onPageChange, me, approve, reject, openDetails, onRefresh, returnBook, onCancelRequest, onSendReminder, navigateTo }) {
  const [activeTab, setActiveTab] = useState("lending");
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [bottomSheetRow, setBottomSheetRow] = useState(null);
  const [viewAllSectionKey, setViewAllSectionKey] = useState(null);
  const [viewAllExpandedRowId, setViewAllExpandedRowId] = useState(null);

  const allItems = page.content || [];

  const lendingItems = useMemo(
    () => allItems.filter(r => r.owner && r.owner.id === me.id),
    [allItems, me.id]
  );

  const borrowingItems = useMemo(
    () => allItems.filter(r => r.requester && r.requester.id === me.id),
    [allItems, me.id]
  );

  function getSectionData(activeTabKey) {
    const pool = activeTabKey === "lending" ? lendingItems : borrowingItems;
    return {
      section1: pool.filter(r => r.status === "pending"),
      section2: pool.filter(r => r.status === "active"),
      section3: pool.filter(r => ["returned", "expired"].includes(r.status)),
    };
  }

  const sections = useMemo(() => getSectionData(activeTab), [activeTab, lendingItems, borrowingItems]);

  function switchTab(key) {
    setActiveTab(key);
    setExpandedRowId(null);
    setViewAllSectionKey(null);
  }

  function toggleExpand(rowId) {
    setExpandedRowId(prev => prev === rowId ? null : rowId);
  }

  function confirmThen(actionType, row) {
    setConfirmAction({ type: actionType, row });
  }

  async function handleConfirm() {
    if (!confirmAction) return;
    const { type, row } = confirmAction;
    setConfirmLoading(true);
    try {
      if (type === "approve") await approve(row.id);
      else if (type === "reject") await reject(row.id);
    } finally {
      setConfirmLoading(false);
      setConfirmAction(null);
    }
  }

  function handleCancelRequest(row) {
    if (onCancelRequest) onCancelRequest(row.id, row.book.title);
  }

  function handleSendReminder(row) {
    if (onSendReminder) onSendReminder(row.id, row.book.title);
  }

  function handleReturnBook(row) {
    if (returnBook) returnBook(row.id, row.book.title);
  }

  function openBottomSheet(row) {
    setBottomSheetRow(row);
  }

  function toggleViewAllExpand(rowId) {
    setViewAllExpandedRowId(prev => prev === rowId ? null : rowId);
  }

  function renderDesktopExpandedDrawer(row, sectionKey) {
    if (!sectionKey) return null;
    const isLending = activeTab === "lending";
    const isPending = row.status === "pending";
    const isActive = row.status === "active";
    const isHistory = ["rejected", "returned", "expired"].includes(row.status);

    return (
      <td colSpan={COL_COUNT} className="expanded-drawer-cell">
        <div className="expanded-drawer">
          <div className="drawer-meta">
            <div className="drawer-meta-row">
              <span className="drawer-meta-label">Message from Borrower:</span>
              <span className="drawer-meta-value">
                {row.borrowerNote
                  ? <blockquote className="borrower-note-text">{row.borrowerNote}</blockquote>
                  : <span className="borrower-note-empty">No message left</span>}
              </span>
            </div>
            <div className="drawer-meta-row">
              <span className="drawer-meta-label">Loan Duration Term:</span>
              <span className="drawer-meta-value">{row.requestedLoanDays} Days</span>
            </div>
            <div className="drawer-meta-row">
              <span className="drawer-meta-label">Expected/Target Return Date:</span>
              <span className="drawer-meta-value">
                {row.dueAt
                  ? dateText(row.dueAt)
                  : row.requestedAt
                    ? dateText(new Date(new Date(row.requestedAt).getTime() + row.requestedLoanDays * 86400000))
                    : "—"}
              </span>
            </div>
          </div>
          <div className="drawer-actions">
            {isLending && isPending && (
              <>
                <button className="btn drawer-btn btn-approve" onClick={() => confirmThen("approve", row)}>
                  <Check size={16} /> Approve Request
                </button>
                <button className="btn drawer-btn btn-reject" onClick={() => confirmThen("reject", row)}>
                  <X size={16} /> Reject Request
                </button>
                <button className="btn drawer-btn btn-ghost" onClick={() => openDetails(row.book)}>
                  <Eye size={16} /> View Details
                </button>
              </>
            )}
            {isLending && isActive && (
              <>
                <button className="btn drawer-btn btn-amber" onClick={() => handleSendReminder(row)}>
                  <Bell size={16} /> Send Reminder
                </button>
                <button className="btn drawer-btn btn-ghost" onClick={() => openDetails(row.book)}>
                  <Eye size={16} /> View Details
                </button>
              </>
            )}
            {!isLending && isPending && (
              <>
                <button className="btn drawer-btn btn-reject" onClick={() => handleCancelRequest(row)}>
                  <Ban size={16} /> Cancel Request
                </button>
                <button className="btn drawer-btn btn-ghost" onClick={() => openDetails(row.book)}>
                  <Eye size={16} /> View Details
                </button>
              </>
            )}
            {!isLending && isActive && (
              <>
                <button className="btn drawer-btn btn-return" onClick={() => handleReturnBook(row)}>
                  <RotateCcw size={16} /> Return Book
                </button>
                <button className="btn drawer-btn btn-ghost" onClick={() => openDetails(row.book)}>
                  <Eye size={16} /> View Details
                </button>
              </>
            )}
            {isHistory && (
              <button className="btn drawer-btn btn-ghost" onClick={() => openDetails(row.book)}>
                <Eye size={16} /> View Details
              </button>
            )}
          </div>
        </div>
      </td>
    );
  }

  function renderDesktopTable(sectionKey, sectionItems) {
    if (sectionItems.length === 0) return null;

    const totalCount = sectionItems.length;
    const displayItems = sectionItems.slice(0, MAX_VISIBLE);
    const isLending = activeTab === "lending";
    const sectionLabel = SECTION_LABELS[activeTab]?.[sectionKey] || "";

    return (
      <div className={`request-section ${sectionKey}`}>
        <SectionHeader
          sectionKey={sectionKey}
          title={sectionLabel}
          showViewAll={totalCount > MAX_VISIBLE}
          onViewAll={() => setViewAllSectionKey(sectionKey)}
        />
        <div className="table-responsive-wrapper">
          <table className="request-table">
            <thead>
              <tr>
                <th style={{ width: "42%" }}>Book</th>
                <th style={{ width: "20%" }}>{isLending ? "Borrower" : "Owner"}</th>
                <th style={{ width: "16%" }}>Status</th>
                <th style={{ width: "22%" }}>Requested</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((row) => {
                const isExpanded = expandedRowId === row.id;
                return (
                  <React.Fragment key={row.id}>
                    <tr
                      className={`request-row ${isLending ? "lending-row" : "borrowing-row"} status-${row.status} ${isExpanded ? "row-expanded" : ""}`}
                      onClick={() => toggleExpand(row.id)}
                    >
                      <td data-label="Book" className="td-book">
                        <div className="book-cell-content">
                          <BookThumb title={row.book.title} size={32} />
                          <div className="book-info-compact">
                            <strong>{row.book.title}</strong>
                            <span>{row.book.author}</span>
                          </div>
                        </div>
                      </td>
                      <td data-label={isLending ? "Borrower" : "Owner"}>
                        {isLending ? row.requester.fullName : row.owner.fullName}
                      </td>
                      <td data-label="Status">
                        <span className={`chip ${row.status}`}>{label(row.status)}</span>
                      </td>
                      <td data-label="Requested" className="td-date-actions">
                        <span className="date-text">{dateText(row.requestedAt)}</span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="expanded-drawer-row" onClick={(e) => e.stopPropagation()}>
                        {renderDesktopExpandedDrawer(row, sectionKey)}
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderMobileCards(sectionKey, sectionItems) {
    if (sectionItems.length === 0) return null;

    const totalCount = sectionItems.length;
    const displayItems = sectionItems.slice(0, MAX_VISIBLE);
    const isLending = activeTab === "lending";
    const sectionLabel = SECTION_LABELS[activeTab]?.[sectionKey] || "";

    return (
      <div className="request-section-mobile">
        <SectionHeader
          sectionKey={sectionKey}
          title={sectionLabel}
          isMobile
          showViewAll={totalCount > MAX_VISIBLE}
          onViewAll={() => setViewAllSectionKey(sectionKey)}
        />
        <div className="request-cards-stack">
          {displayItems.map((row) => (
            <div
              key={row.id}
              className={`request-card status-${row.status}`}
              onClick={() => openBottomSheet(row)}
            >
              <div className="request-card-lead">
                <BookThumb title={row.book.title} size={40} />
                <div className="request-card-info">
                  <div className="request-card-title">{row.book.title}</div>
                  <div className="request-card-person">
                    <User size={11} />
                    {isLending ? row.requester.fullName : row.owner.fullName}
                  </div>
                </div>
              </div>
              <div className="request-card-footer">
                <span className={`chip ${row.status}`}>{label(row.status)}</span>
                <span className="request-card-date">{dateText(row.requestedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderBottomSheetActions(row) {
    const isLending = row.owner && row.owner.id === me.id;
    const isPending = row.status === "pending";
    const isActive = row.status === "active";
    const isHistory = ["rejected", "returned", "expired"].includes(row.status);

    return (
      <div className="bottom-sheet-actions">
        {isLending && isPending && (
          <>
            <button className="btn btn-block btn-approve" onClick={(e) => { e.stopPropagation(); setBottomSheetRow(null); confirmThen("approve", row); }}>
              <Check size={16} /> Approve Request
            </button>
            <button className="btn btn-block btn-reject" onClick={(e) => { e.stopPropagation(); setBottomSheetRow(null); confirmThen("reject", row); }}>
              <X size={16} /> Reject Request
            </button>
            <button className="btn btn-block btn-ghost-block" onClick={(e) => { e.stopPropagation(); setBottomSheetRow(null); openDetails(row.book); }}>
              <Eye size={16} /> View Details
            </button>
          </>
        )}
        {isLending && isActive && (
          <>
            <button className="btn btn-block btn-amber" onClick={(e) => { e.stopPropagation(); setBottomSheetRow(null); handleSendReminder(row); }}>
              <Bell size={16} /> Send Reminder
            </button>
            <button className="btn btn-block btn-ghost-block" onClick={(e) => { e.stopPropagation(); setBottomSheetRow(null); openDetails(row.book); }}>
              <Eye size={16} /> View Details
            </button>
          </>
        )}
        {!isLending && isPending && (
          <>
            <button className="btn btn-block btn-reject" onClick={(e) => { e.stopPropagation(); setBottomSheetRow(null); handleCancelRequest(row); }}>
              <Ban size={16} /> Cancel Request
            </button>
            <button className="btn btn-block btn-ghost-block" onClick={(e) => { e.stopPropagation(); setBottomSheetRow(null); openDetails(row.book); }}>
              <Eye size={16} /> View Details
            </button>
          </>
        )}
        {!isLending && isActive && (
          <>
            <button className="btn btn-block btn-return" onClick={(e) => { e.stopPropagation(); setBottomSheetRow(null); handleReturnBook(row); }}>
              <RotateCcw size={16} /> Return Book
            </button>
            <button className="btn btn-block btn-ghost-block" onClick={(e) => { e.stopPropagation(); setBottomSheetRow(null); openDetails(row.book); }}>
              <Eye size={16} /> View Details
            </button>
          </>
        )}
        {isHistory && (
          <button className="btn btn-block btn-ghost-block" onClick={(e) => { e.stopPropagation(); setBottomSheetRow(null); openDetails(row.book); }}>
            <Eye size={16} /> View Details
          </button>
        )}
      </div>
    );
  }

  function renderViewAllTable(items, sectionKey) {
    const isLending = activeTab === "lending";
    return (
      <table className="request-table view-all-table">
        <thead>
          <tr>
            <th style={{ width: "42%" }}>Book</th>
            <th style={{ width: "20%" }}>{isLending ? "Borrower" : "Owner"}</th>
            <th style={{ width: "16%" }}>Status</th>
            <th style={{ width: "22%" }}>Requested</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const isExpanded = viewAllExpandedRowId === row.id;
            return (
              <React.Fragment key={row.id}>
                <tr
                  className={`request-row ${isLending ? "lending-row" : "borrowing-row"} status-${row.status} ${isExpanded ? "row-expanded" : ""}`}
                  onClick={() => toggleViewAllExpand(row.id)}
                >
                  <td data-label="Book" className="td-book">
                    <div className="book-cell-content">
                      <BookThumb title={row.book.title} size={28} />
                      <div className="book-info-compact">
                        <strong>{row.book.title}</strong>
                        <span>{row.book.author}</span>
                      </div>
                    </div>
                  </td>
                  <td data-label={isLending ? "Borrower" : "Owner"}>
                    {isLending ? row.requester.fullName : row.owner.fullName}
                  </td>
                  <td data-label="Status">
                    <span className={`chip ${row.status}`}>{label(row.status)}</span>
                  </td>
                  <td data-label="Requested" className="td-date-actions">
                    <span className="date-text">{dateText(row.requestedAt)}</span>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="expanded-drawer-row" onClick={(e) => e.stopPropagation()}>
                    {renderDesktopExpandedDrawer(row, sectionKey)}
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    );
  }

  useEffect(() => {
    if (viewAllSectionKey) {
      document.body.style.overflow = "hidden";
      window.history.pushState({ viewAllModal: true }, "");
      const onPopState = () => setViewAllSectionKey(null);
      window.addEventListener("popstate", onPopState);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("popstate", onPopState);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [viewAllSectionKey]);

  const hasAnyContent = sections.section1.length > 0 || sections.section2.length > 0 || sections.section3.length > 0;
  const viewAllItems = viewAllSectionKey ? sections[viewAllSectionKey] || [] : [];
  const viewAllLabel = viewAllSectionKey ? (SECTION_LABELS[activeTab]?.[viewAllSectionKey] || "") : "";

  return (
    <div className="request-container">
      <section className="topbar">
        <div className="page-title">
          <h2 className="hero-gradient">Borrow Requests</h2>
          <p>Approve or reject lending requests from others and track the books you've requested.</p>
        </div>
        <div className="hero-card-actions">
            <RefreshButton onRefresh={() => onRefresh(page.page)} />
            <button className="btn primary" onClick={() => navigateTo("catalog")}>
              <Plus size={17} /> Request a Book
            </button>
          </div>
        </section>
        <div className="request-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`request-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => switchTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <Panel>
        <div className="request-desktop-view">
          {!hasAnyContent ? (
            <EmptyState
              icon="ClipboardCheck"
              title={activeTab === "lending" ? "No lending activity" : "No borrowing activity"}
              message="Matching requests and loans will appear here organized by status."
            />
          ) : (
            <>
              {renderDesktopTable("section1", sections.section1)}
              {renderDesktopTable("section2", sections.section2)}
              {renderDesktopTable("section3", sections.section3)}
            </>
          )}
        </div>

        <div className="request-mobile-view">
          {!hasAnyContent ? (
            <EmptyState
              icon="ClipboardCheck"
              title={activeTab === "lending" ? "No lending activity" : "No borrowing activity"}
              message="Matching requests and loans will appear here organized by status."
            />
          ) : (
            <>
              {renderMobileCards("section1", sections.section1)}
              {renderMobileCards("section2", sections.section2)}
              {renderMobileCards("section3", sections.section3)}
            </>
          )}
        </div>

      </Panel>

      <ConfirmModal
        action={confirmAction?.type}
        bookTitle={confirmAction?.row?.book?.title}
        loading={confirmLoading}
        onConfirm={handleConfirm}
        onCancel={() => { setConfirmAction(null); setConfirmLoading(false); }}
      />

      {bottomSheetRow && (
        <div className="bottom-sheet-backdrop" onClick={() => setBottomSheetRow(null)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-grip" />
            <div className="bottom-sheet-head">
              <h3>Review Request for <strong>{bottomSheetRow.book.title}</strong></h3>
            </div>
            <div className="bottom-sheet-body">
              {renderBottomSheetActions(bottomSheetRow)}
            </div>
          </div>
        </div>
      )}

      {viewAllSectionKey && (
        <div className="modal-backdrop open" onClick={() => setViewAllSectionKey(null)}>
          <div className="modal view-all-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{viewAllLabel} ({viewAllItems.length})</h3>
              <button className="btn icon-only" onClick={() => setViewAllSectionKey(null)}>
                <XCircle size={20} />
              </button>
            </div>
            <div className="view-all-body">
              {viewAllItems.length > 0 ? renderViewAllTable(viewAllItems, viewAllSectionKey) : (
                <div style={{ padding: 48, textAlign: "center" }}>
                  <EmptyState icon="ClipboardCheck" title="All caught up!" message="No more pending requests in this section." />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
