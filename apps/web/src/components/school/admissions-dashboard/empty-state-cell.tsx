"use client";

import Link from "next/link";

export const START_ADMISSION_HREF = "/school/admissions/applications?action=start-admission";
export const APPLICATIONS_HREF = "/school/admissions/applications";

type AdmissionsEmptyStateCellProps = {
  colSpan: number;
  title: string;
  body: string;
  actionHref: string;
  actionLabel: string;
};

export function AdmissionsEmptyStateCell({
  colSpan,
  title,
  body,
  actionHref,
  actionLabel,
}: AdmissionsEmptyStateCellProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-[#64748B]">
          <div>
            <p className="font-black text-[#071D49]">{title}</p>
            <p className="mt-1 text-sm leading-6">{body}</p>
          </div>
          <Link
            href={actionHref}
            className="inline-flex items-center justify-center rounded-lg bg-[#071D49] px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-[#12326C]"
          >
            {actionLabel}
          </Link>
        </div>
      </td>
    </tr>
  );
}
