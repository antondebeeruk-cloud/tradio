"use client";

import { Camera, FileText } from "lucide-react";
import { useRef, useState } from "react";

export function ReceiptCapture() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  return (
    <div className="xl:col-span-3 rounded-lg border border-field bg-white p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Camera aria-hidden="true" className="text-copper" size={18} />
            <h3 className="text-sm font-semibold">Attach receipt or invoice</h3>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Take a photo or upload an image/PDF. Image files are read
            automatically after saving; PDFs are saved for viewing and download.
          </p>
        </div>
        <label className="btn-secondary cursor-pointer">
          <Camera aria-hidden="true" size={16} />
          Take photo or upload file
          <input
            ref={inputRef}
            accept="image/*,application/pdf"
            capture="environment"
            className="sr-only"
            name="receipt_file"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                setFileName(file.name);
                setPreviewUrl(
                  file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
                );
              }
            }}
            type="file"
          />
        </label>
      </div>

      {fileName ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[160px_1fr]">
          {previewUrl ? (
            <img
              alt="Receipt preview"
              className="h-40 w-full rounded-lg border border-field object-cover"
              src={previewUrl}
            />
          ) : null}
          <div className="rounded-lg bg-mist p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold text-ink">
              <FileText aria-hidden="true" size={16} />
              File attached
            </div>
            <p className="mt-2 text-slate-500">
              {fileName}. Fill in any details you know, save it, then scan the
              saved image in the background.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
