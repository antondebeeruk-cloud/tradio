"use client";

import { Copy } from "lucide-react";
import { useState } from "react";

type CopyButtonProps = {
  text: string;
};

export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className="btn-secondary"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }}
      type="button"
    >
      <Copy aria-hidden="true" size={16} />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
