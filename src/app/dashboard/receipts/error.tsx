"use client";

import { ModuleError } from "@/components/module-error";

export default function ReceiptsError({ reset }: { reset: () => void }) {
  return <ModuleError moduleId="receipts" reset={reset} />;
}

