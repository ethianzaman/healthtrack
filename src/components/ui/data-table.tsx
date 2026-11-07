import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Phone layout: "title" heads the row card, "hide" drops it. Columns with an empty header are treated as row actions. */
  mobile?: "title" | "hide";
}

/**
 * Generic, server-renderable table styled like a ruled log sheet.
 * Below `md` each row becomes a compact card, so nothing scrolls sideways on phones.
 */
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  empty,
  mobileLimit = 10,
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: ReactNode;
  /** Phone cards shown before a "Show all" toggle (keeps long histories scannable). */
  mobileLimit?: number;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  const title = columns.find((c) => c.mobile === "title") ?? columns[0];
  const actions = columns.filter((c) => c.header === "" && c !== title);
  const details = columns.filter((c) => c !== title && c.header !== "" && c.mobile !== "hide");

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/80">
            <tr>
              {columns.map((c, i) => (
                <th key={c.header || `col-${i}`} scope="col" className={cn("eyebrow whitespace-nowrap px-4 pb-2 pt-3 font-normal", c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-canvas/70">
                {columns.map((c, i) => (
                  <td key={c.header || `col-${i}`} className={cn("px-4 py-2.5 align-middle text-ink-2", c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-ink/80 md:hidden">
        <MobileList rows={rows.slice(0, mobileLimit)} render={renderCard} />
        {rows.length > mobileLimit ? (
          <details className="group border-t border-line-soft">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-center font-mono text-[12px] uppercase tracking-wider text-ink-2 group-open:hidden">
              Show all {rows.length}
            </summary>
            <MobileList rows={rows.slice(mobileLimit)} render={renderCard} />
          </details>
        ) : null}
      </div>
    </>
  );

  function renderCard(row: T) {
    return (
      <li key={row.id} className="px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 text-[13px] text-ink-2">{title.cell(row)}</div>
          {actions.length ? (
            <div className="-my-1 -mr-2 flex shrink-0 items-center gap-1">
              {actions.map((c, i) => (
                <Fragment key={i}>{c.cell(row)}</Fragment>
              ))}
            </div>
          ) : null}
        </div>
        <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5 min-[480px]:grid-cols-3">
          {details.map((c) => (
            <div key={c.header} className="min-w-0">
              <dt className="eyebrow">{c.header}</dt>
              <dd className="mt-0.5 break-words text-sm text-ink-2 [&:empty]:after:content-['--'] [&:empty]:after:text-ink-3">{c.cell(row)}</dd>
            </div>
          ))}
        </dl>
      </li>
    );
  }
}

function MobileList<T>({ rows, render }: { rows: T[]; render: (row: T) => ReactNode }) {
  return <ul className="divide-y divide-line-soft">{rows.map(render)}</ul>;
}
