"use client";

import { MapPinned, Navigation, X } from "lucide-react";
import { useState } from "react";

export function JobMap({ address, jobTitle }: { address: string; jobTitle: string }) {
  const [visible, setVisible] = useState(false);
  const query = encodeURIComponent(address);

  return (
    <section className="mt-4 overflow-hidden rounded-lg border border-field bg-mist">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <MapPinned aria-hidden="true" className="text-copper" size={17} />
            Job location
          </p>
          <p className="mt-1 truncate text-sm text-slate-600">{address}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => setVisible((current) => !current)} type="button">
            {visible ? <X aria-hidden="true" size={16} /> : <MapPinned aria-hidden="true" size={16} />}
            {visible ? "Hide map" : "Show map"}
          </button>
          <a className="btn-primary" href={`https://www.google.com/maps/dir/?api=1&destination=${query}`} rel="noreferrer" target="_blank">
            <Navigation aria-hidden="true" size={16} /> Directions
          </a>
        </div>
      </div>
      {visible ? (
        <div className="aspect-[16/9] min-h-64 w-full border-t border-field sm:aspect-[21/9]">
          <iframe
            allowFullScreen
            className="h-full w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps?q=${query}&output=embed`}
            title={`${jobTitle} location map`}
          />
        </div>
      ) : null}
    </section>
  );
}
