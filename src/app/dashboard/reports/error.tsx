"use client";

import { ModuleError } from "@/components/module-error";

export default function ReportsError({ reset }: { reset: () => void }) {
  return <ModuleError moduleId="reports" reset={reset} />;
}

