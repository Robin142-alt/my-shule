import * as React from "react"

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  columns?: string[];
  data?: any[];
  renderRow?: (item: any) => React.ReactNode;
  emptyState?: React.ReactNode;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className = "", columns, data, renderRow, emptyState, children, ...props }, ref) => {
    if (columns && data && renderRow) {
      return (
        <div role="region" aria-label={props["aria-label"] ?? "Scrollable records"} tabIndex={0} className="app-table-scroll relative w-full overflow-auto rounded-xl border border-border bg-white shadow-sm ring-1 ring-slate-900/5">
          <table
            ref={ref}
            className={`w-full caption-bottom text-sm transition-colors ${className}`}
            {...props}
          >
            <thead className="bg-primary-soft backdrop-blur-md border-b border-border">
              <tr className="group border-b border-border transition-all duration-200">
                {columns.map((col, i) => (
                  <th key={i} className="h-11 px-4 text-left align-middle text-[12px] font-semibold uppercase tracking-wider text-muted">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {data.length === 0 && emptyState ? (
                <tr className="group border-b border-border">
                  <td colSpan={columns.length} className="p-4 align-middle text-foreground">
                    {emptyState}
                  </td>
                </tr>
              ) : (
                data.map((item, idx) => <React.Fragment key={idx}>{renderRow(item)}</React.Fragment>)
              )}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div role="region" aria-label={props["aria-label"] ?? "Scrollable records"} tabIndex={0} className="app-table-scroll relative w-full overflow-auto rounded-xl border border-border bg-white shadow-sm ring-1 ring-slate-900/5">
        <table
          ref={ref}
          className={`w-full caption-bottom text-sm transition-colors ${className}`}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }
)
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className = "", ...props }, ref) => (
  <thead ref={ref} className={`bg-primary-soft backdrop-blur-md border-b border-border ${className}`} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className = "", ...props }, ref) => (
  <tbody
    ref={ref}
    className={`[&_tr:last-child]:border-0 ${className}`}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className = "", ...props }, ref) => (
  <tfoot
    ref={ref}
    className={`border-t bg-surface-strong font-medium [&>tr]:last:border-b-0 ${className}`}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className = "", ...props }, ref) => (
  <tr
    ref={ref}
    className={`group border-b border-border transition-all duration-200 hover:bg-primary-soft hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_3px_rgba(0,0,0,0.02)] data-[state=selected]:bg-primary-soft ${className}`}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className = "", ...props }, ref) => (
  <th
    ref={ref}
    className={`h-11 px-4 text-left align-middle text-[12px] font-semibold uppercase tracking-wider text-muted [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] ${className}`}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className = "", ...props }, ref) => (
  <td
    ref={ref}
    className={`p-4 align-middle text-foreground transition-colors group-hover:text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] ${className}`}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className = "", ...props }, ref) => (
  <caption
    ref={ref}
    className={`mt-4 text-sm text-muted-foreground ${className}`}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
