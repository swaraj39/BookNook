import React from "react";
import { EmptyState } from "./EmptyState";
export function Table({ headers, children }) {
  const rows = React.Children.count(children);
  if (!rows) return <EmptyState icon="Inbox" title="Nothing to show" message="There are no records to display in this list." />;
  return <div className="table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}