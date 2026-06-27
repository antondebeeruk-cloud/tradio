"use client";

import { ModuleError } from "@/components/module-error";

export default function OverviewError({ reset }: { reset: () => void }) {
  return <ModuleError moduleId="overview" reset={reset} />;
}

