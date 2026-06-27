"use client";

import { ModuleError } from "@/components/module-error";

export default function SettingsError({ reset }: { reset: () => void }) {
  return <ModuleError moduleId="settings" reset={reset} />;
}

