"use client";

import Link from "next/link";
import { Mail, Printer } from "lucide-react";

type PrintActionsProps = {
  backHref: string;
  emailDisabled: boolean;
  documentId: string;
  sendAction: (formData: FormData) => Promise<void>;
};

export function PrintActions({
  backHref,
  documentId,
  emailDisabled,
  sendAction,
}: PrintActionsProps) {
  return (
    <div className="print:hidden flex flex-col gap-2 border-b border-field bg-cream px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <Link
        className="btn-secondary px-4"
        href={backHref}
      >
        Back
      </Link>
      <div className="flex flex-col gap-2 sm:flex-row">
        <form action={sendAction}>
          <input name="id" type="hidden" value={documentId} />
          <button
            className={`btn-secondary w-full px-4 ${
              emailDisabled
                ? "cursor-not-allowed bg-slate-100 text-slate-400"
                : ""
            }`}
            disabled={emailDisabled}
          >
            <Mail aria-hidden="true" size={17} />
            Email customer
          </button>
        </form>
        <button
          className="btn-primary"
          onClick={() => window.print()}
          type="button"
        >
          <Printer aria-hidden="true" size={17} />
          Export PDF
        </button>
      </div>
    </div>
  );
}
