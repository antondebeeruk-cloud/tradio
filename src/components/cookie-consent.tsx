"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const storageKey = "tradio_cookie_consent_v1";

type CookieChoice = {
  analytics: boolean;
  essential: true;
  marketing: boolean;
  savedAt: string;
};

function saveChoice(choice: Omit<CookieChoice, "essential" | "savedAt">) {
  const storedChoice: CookieChoice = {
    ...choice,
    essential: true,
    savedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(storageKey, JSON.stringify(storedChoice));
  window.dispatchEvent(new CustomEvent("tradio-cookie-consent", { detail: storedChoice }));
}

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    setIsVisible(!window.localStorage.getItem(storageKey));
  }, []);

  if (!isVisible) {
    return null;
  }

  const closeWithChoice = (choice: Omit<CookieChoice, "essential" | "savedAt">) => {
    saveChoice(choice);
    setIsVisible(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-field bg-white px-5 py-4 shadow-[0_-12px_35px_rgba(15,23,42,0.12)]">
      <div className="mx-auto grid max-w-[1500px] gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm leading-6 text-slate-600">
            We use cookies to improve your experience, keep you signed in, and
            understand how Tradio is used. You can accept or manage your
            preferences.
          </p>
          <Link className="mt-1 inline-flex text-sm font-semibold text-forest hover:underline" href="/cookie-policy">
            Cookie Policy
          </Link>

          {isManaging ? (
            <div className="mt-4 grid gap-3 rounded-lg border border-field bg-mist p-4 sm:grid-cols-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <input checked disabled type="checkbox" />
                Essential
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <input
                  checked={analytics}
                  onChange={(event) => setAnalytics(event.target.checked)}
                  type="checkbox"
                />
                Analytics
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <input
                  checked={marketing}
                  onChange={(event) => setMarketing(event.target.checked)}
                  type="checkbox"
                />
                Marketing
              </label>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {isManaging ? (
            <button
              className="btn-accent"
              onClick={() => closeWithChoice({ analytics, marketing })}
              type="button"
            >
              Save preferences
            </button>
          ) : (
            <button
              className="btn-secondary"
              onClick={() => setIsManaging(true)}
              type="button"
            >
              Manage preferences
            </button>
          )}
          <button
            className="btn-primary"
            onClick={() => closeWithChoice({ analytics: false, marketing: false })}
            type="button"
          >
            Reject non-essential
          </button>
          <button
            className="btn-accent"
            onClick={() => closeWithChoice({ analytics: true, marketing: true })}
            type="button"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
