"use client";

import { ModuleError } from "@/components/module-error";

export default function QuotesError({ reset }: { reset: () => void }) {
  return <ModuleError moduleId="quotes" reset={reset} />;
}

