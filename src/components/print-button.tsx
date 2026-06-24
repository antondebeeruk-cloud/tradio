"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button className="btn-accent" onClick={() => window.print()} type="button">
      <Printer aria-hidden="true" size={16} />
      Print
    </button>
  );
}
