"use client";

import { ModuleError } from "@/components/module-error";

export default function InvoicesError({ reset }: { reset: () => void }) {
  return <ModuleError moduleId="invoices" reset={reset} />;
}

