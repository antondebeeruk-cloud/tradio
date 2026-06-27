"use client";

import { ModuleError } from "@/components/module-error";

export default function SupportError({ reset }: { reset: () => void }) {
  return <ModuleError moduleId="support" reset={reset} />;
}

