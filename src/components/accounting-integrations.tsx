import { ExternalLink, Link2, Unplug } from "lucide-react";
import Link from "next/link";

export type AccountingConnectionDisplay = {
  configured: boolean;
  connectedAt?: string | null;
  error?: string | null;
  id?: string | null;
  name?: string | null;
  provider: "quickbooks" | "sage" | "xero";
};

const providerDetails = {
  xero: {
    accent: "bg-[#e8f6ff] text-[#006b9a]",
    description: "Connect your Xero organisation securely.",
    label: "Xero",
  },
  sage: {
    accent: "bg-[#e9f8ef] text-[#167342]",
    description: "Connect Sage Business Cloud Accounting.",
    label: "Sage",
  },
  quickbooks: {
    accent: "bg-[#eff8df] text-[#4c7500]",
    description: "Connect your QuickBooks Online company.",
    label: "QuickBooks",
  },
} as const;

function providerRoutes(provider: AccountingConnectionDisplay["provider"]) {
  if (provider === "xero") {
    return { connect: "/api/xero/connect", disconnect: "/api/xero/disconnect" };
  }
  return {
    connect: `/api/accounting/${provider}/connect`,
    disconnect: `/api/accounting/${provider}/disconnect`,
  };
}

export function AccountingIntegrations({
  connections,
}: {
  connections: AccountingConnectionDisplay[];
}) {
  return (
    <section className="surface-pad mb-6" id="accounting-integrations">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#e8f6ff] text-[#006b9a]">
          <Link2 aria-hidden="true" size={20} />
        </div>
        <div>
          <p className="eyebrow">Connections</p>
          <h2 className="text-base font-semibold">Accounting integrations</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Authorise Tradio without sharing your accounting password. Connected
            organisations will power customer and transaction syncing in the next stage.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {connections.map((connection) => {
          const details = providerDetails[connection.provider];
          const routes = providerRoutes(connection.provider);
          const connected = Boolean(connection.id) && !connection.error;

          return (
            <article
              className="flex min-w-0 flex-col rounded-lg border border-field bg-mist p-4"
              key={connection.provider}
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg font-black ${details.accent}`}>
                  {details.label.slice(0, 1)}
                </div>
                <span
                  className={`status-pill ${
                    connected
                      ? "bg-[#e7f7ef] text-[#177a55]"
                      : "bg-white text-slate-500"
                  }`}
                >
                  {connected ? "Connected" : "Not connected"}
                </span>
              </div>
              <h3 className="mt-4 font-semibold">{details.label}</h3>
              <p className="mt-1 min-h-10 text-sm leading-5 text-slate-500">
                {details.description}
              </p>

              {connection.error ? (
                <p className="notice mt-4 text-sm">{connection.error}</p>
              ) : connected ? (
                <div className="mt-4 rounded-lg border border-field bg-white p-3 text-sm">
                  <p className="truncate font-semibold text-ink">
                    {connection.name ?? details.label}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    ID: {connection.id}
                  </p>
                  {connection.connectedAt ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Connected {new Date(connection.connectedAt).toLocaleDateString("en-GB")}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  {connection.configured
                    ? "Ready to connect."
                    : "Server setup required before connecting."}
                </p>
              )}

              <div className="mt-auto flex flex-col gap-2 pt-5 sm:flex-row xl:flex-col">
                {connection.configured ? (
                  <Link className={connected ? "btn-secondary" : "btn-primary"} href={routes.connect}>
                    <ExternalLink aria-hidden="true" size={16} />
                    {connected ? "Reconnect" : `Connect ${details.label}`}
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-lg border border-field bg-white px-4 text-sm font-bold text-slate-400"
                  >
                    Server setup required
                  </span>
                )}
                {connected ? (
                  <form action={routes.disconnect} method="post">
                    <button className="btn-secondary w-full" type="submit">
                      <Unplug aria-hidden="true" size={16} />
                      Disconnect
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
