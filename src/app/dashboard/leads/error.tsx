"use client";

import { ModuleError } from "@/components/module-error";

export default function LeadsError({ reset }: { reset: () => void }) {
  return <ModuleError moduleId="leads" reset={reset} />;
}

