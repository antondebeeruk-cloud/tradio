import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export function ModulePanelUnavailable({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <div className="flex min-h-32 flex-col items-start justify-center px-5 py-6">
      <div className="flex items-center gap-2 font-semibold text-ink">
        <AlertTriangle aria-hidden="true" className="text-copper" size={18} />
        {label} is temporarily unavailable
      </div>
      <p className="mt-2 text-sm text-slate-500">
        Other Tradio modules are still working normally.
      </p>
      <Link className="mt-3 text-sm font-semibold text-forest hover:underline" href={href}>
        Try {label} again
      </Link>
    </div>
  );
}
