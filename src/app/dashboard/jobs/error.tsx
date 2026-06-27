"use client";

import { ModuleError } from "@/components/module-error";

export default function JobsError({ reset }: { reset: () => void }) {
  return <ModuleError moduleId="jobs" reset={reset} />;
}

