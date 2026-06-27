"use client";

import { ModuleError } from "@/components/module-error";

export default function AdminError({ reset }: { reset: () => void }) {
  return <ModuleError moduleId="admin" reset={reset} />;
}
