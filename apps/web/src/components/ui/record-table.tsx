import { Children, Fragment, cloneElement, isValidElement, type ReactElement, type ReactNode, type TableHTMLAttributes } from "react";

type TableNode = ReactElement<{
  children?: ReactNode;
  colSpan?: number;
  rowSpan?: number;
  role?: string;
  scope?: string;
}>;

function elements(children: ReactNode): TableNode[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<TableNode["props"]>(child)) return [];
    return child.type === Fragment ? elements(child.props.children) : [child];
  });
}

function labelText(children: ReactNode): string {
  return Children.toArray(children).map((child) => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    return isValidElement<{ children?: ReactNode }>(child) ? labelText(child.props.children) : "";
  }).join("").trim();
}

/** One set of records and controls: a table on desktop, labeled rows on phones.
 * Complex matrices keep their original table layout, including spanning headers.
 */
export function RecordTable({ children, className = "", ...props }: TableHTMLAttributes<HTMLTableElement>) {
  const sections = elements(children);
  const head = sections.find((section) => section.type === "thead");
  const headerRows = elements(head?.props.children);
  const headings = elements(headerRows[0]?.props.children);
  const labels = headings.map((heading) => labelText(heading.props.children));
  const rows = sections.filter((section) => section.type === "tbody").flatMap((section) => elements(section.props.children));
  const simple = headerRows.length === 1 && headings.length > 0
    && headings.every((heading) => heading.type === "th" && !heading.props.colSpan && !heading.props.rowSpan)
    && rows.every((row) => {
      const cells = elements(row.props.children);
      return row.type === "tr" && (cells.length === 1 && cells[0].props.colSpan === labels.length
        || cells.length === labels.length && cells.every((cell) => cell.type === "td" && !cell.props.colSpan && !cell.props.rowSpan));
    });

  if (!simple) return <table {...props} className={className}>{children}</table>;

  return (
    <table {...props} role="table" className={`app-record-table ${className}`}>
      {sections.map((section) => {
        if (!["thead", "tbody"].includes(String(section.type))) return section;
        return cloneElement(section, { role: "rowgroup" }, elements(section.props.children).map((row, rowIndex) =>
          cloneElement(row, { key: row.key ?? rowIndex, role: "row" }, elements(row.props.children).map((cell, index) => {
            if (section.type === "thead") return cloneElement(cell, { key: cell.key ?? index, role: "columnheader", scope: "col" });
            return cloneElement(cell, { key: cell.key ?? index, role: "cell" }, cell.props.colSpan ? cell.props.children : <>
              <span className="app-cell-label" aria-hidden="true">{labels[index]}</span>
              <div className="app-cell-value">{cell.props.children}</div>
            </>);
          }))),
        );
      })}
    </table>
  );
}
