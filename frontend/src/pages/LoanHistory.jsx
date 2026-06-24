import React from "react";
import { Panel } from "../components/common/Panel";
import { Table } from "../components/common/Table";
import { Pagination } from "../components/common/Pagination";
import { label, dateText } from "../utils/helpers";

export function LoanHistory({ page, onPageChange }) {
  return (
    <Panel title="Borrowing History">
      <Table headers={["Book", "Borrower", "Owner", "Status", "Opened", "Closed"]}>
        {page.content.map((row) => (
          <tr key={row.id}>
            <td>
              <strong>{row.book?.title || "-"}</strong>
              <br />
              {row.book?.author || "-"}
            </td>
            <td>{row.requester?.fullName || row.borrower?.fullName || "-"}</td>
            <td>{row.owner?.fullName || row.book?.owner?.fullName || "-"}</td>
            <td>
              <span className={`chip ${row.status}`}>
                {label(row.status)}
              </span>
            </td>
            <td>{dateText(row.borrowedAt)}</td>
            <td>{dateText(row.returnedAt)}</td>
          </tr>
        ))}
      </Table>

      {(page.totalPages || 0) > 1 && (
        <Pagination
          page={page.page || page.pageNumber || 0}
          totalPages={page.totalPages || 0}
          totalElements={page.totalElements || 0}
          onPageChange={onPageChange}
        />
      )}
    </Panel>
  );
}