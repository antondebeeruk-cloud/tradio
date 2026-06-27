"use client";

import { ModuleError } from "@/components/module-error";

export default function CustomersError({ reset }: { reset: () => void }) {
  return <ModuleError moduleId="customers" reset={reset} />;
}

