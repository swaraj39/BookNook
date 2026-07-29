import React from "react";
import { Panel } from "../components/common/Panel";
import { Table } from "../components/common/Table";
import { Pagination } from "../components/common/Pagination";
import { RefreshButton } from "../components/common/RefreshButton";
export function Users({ page, onPageChange, me, onEditUser, onToggleStatus, onRefresh }) {
  return (
    <Panel title="Users" actions={onRefresh && <RefreshButton onRefresh={() => onRefresh(page.page)} title="Refresh users" />}>
      <div className="table-responsive-wrapper">
        <Table headers={["Name", "Email", "Team", "Role", "Status", "Actions"]}>
          {page.content.map((user) => {
            const isSelf = user.id === me?.id;
            return (
              <tr key={user.id}>
                <td data-label="Name">{user.fullName}</td>
                <td data-label="Email">{user.email}</td>
                <td data-label="Team">{user.team || "-"}</td>
                <td data-label="Role">
                  <span className={`chip chip-role-${user.role === "ADMIN" ? "admin" : "user"}`}>{user.role}</span>
                </td>
                <td data-label="Status">
                  <span className={`chip chip-status-${user.status}`}>{user.status}</span>
                </td>
                <td data-label="Actions">
                  <div className="row-actions">
                    <button className="btn" disabled={isSelf} title={isSelf ? "You cannot edit your own account" : ""} onClick={() => onEditUser(user)}>Edit</button>
                    <button className="btn" disabled={isSelf} title={isSelf ? "You cannot change your own status" : ""} onClick={() => onToggleStatus(user)}>
                      {user.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
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
