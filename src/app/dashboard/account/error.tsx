"use client";

import { ModuleError } from "@/components/module-error";

export default function AccountError({ reset }: { reset: () => void }) {
  return <ModuleError moduleId="account" reset={reset} />;
}

