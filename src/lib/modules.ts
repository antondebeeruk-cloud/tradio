export const tradioModules = {
  overview: { label: "Overview", href: "/dashboard" },
  customers: { label: "Customers", href: "/customers" },
  leads: { label: "Leads", href: "/dashboard/leads" },
  quotes: { label: "Quotes", href: "/quotes" },
  invoices: { label: "Invoices", href: "/invoices" },
  receipts: { label: "Receipts", href: "/dashboard/receipts" },
  reports: { label: "Reports", href: "/dashboard/reports" },
  jobs: { label: "Jobs", href: "/dashboard/jobs" },
  support: { label: "Support", href: "/dashboard/support" },
  settings: { label: "Settings", href: "/settings" },
  account: { label: "Account", href: "/dashboard/account" },
  admin: { label: "Admin", href: "/dashboard/admin" },
} as const;

export type TradioModuleId = keyof typeof tradioModules;

