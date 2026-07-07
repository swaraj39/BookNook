import React from "react";
import { Panel } from "../components/common/Panel";
import { Table } from "../components/common/Table";
import { Pagination } from "../components/common/Pagination";
import { RefreshButton } from "../components/common/RefreshButton";
import { label, dateText } from "../utils/helpers";
export function LoanHistory({ page, onPageChange, onRefresh }) {
  return (
    <Panel title="Borrowing History" actions={onRefresh && <RefreshButton onRefresh={() => onRefresh(page.page)} title="Refresh history" />}>
      <div className="table-responsive-wrapper">
        <Table headers={["Book", "Borrower", "Owner", "Status", "Opened", "Closed", "Actions"]}>
          {page.content.map((row) => (
            <tr key={row.id} className={`history-row ${row.status}`}>
              <td data-label="Book">
                <div className="book-info-compact">
                  <strong>{row.book?.title || "-"}</strong>
                  <span>{row.book?.author || "-"}</span>
                </div>
              </td>
              <td data-label="Borrower">{row.requester?.fullName || row.borrower?.fullName || "-"}</td>
              <td data-label="Owner">{row.owner?.fullName || row.book?.owner?.fullName || "-"}</td>
              <td data-label="Status">
                <span className={`chip ${row.status}`}>{label(row.status)}</span>
              </td>
              <td data-label="Opened">{dateText(row.borrowedAt)}</td>
              <td data-label="Closed">{dateText(row.returnedAt)}</td>
              <td data-label="Actions">
                <div className="row-actions">
                  <button className="btn" onClick={() => openDetails(row.book)}>View Book</button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </div>
      <div className="two-block-pagination">
        {(page.totalPages || 0) > 1 && (
          <Pagination
            page={page.page || page.pageNumber || 0}
            totalPages={page.totalPages || 0}
            totalElements={page.totalElements || 0}
            onPageChange={onPageChange}
          />
        )}
      </div>
    </Panel>
  );
}