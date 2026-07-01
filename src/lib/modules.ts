export const tradioModules = {
  overview: { label: "Overview", href: "/dashboard" },
  customers: { label: "Customers", href: "/customers" },
  leads: { label: "Leads", href: "/dashboard/leads" },
  quotes: { label: "Quotes", href: "/quotes" },
  invoices: { label: "Invoices", href: "/invoices" },
  receipts: { label: "Receipts", href: "/dashboard/receipts" },
  fuelLog: { label: "Fuel Log", href: "/dashboard/fuel-log" },
  calendar: { label: "Calendar", href: "/dashboard/calendar" },
  reports: { label: "Reports", href: "/dashboard/reports" },
  jobs: { label: "Jobs", href: "/dashboard/jobs" },
  purchaseOrders: { label: "Purchase Orders", href: "/dashboard/purchase-orders" },
  recurring: { label: "Recurring Work", href: "/dashboard/recurring" },
  team: { label: "Team", href: "/dashboard/team" },
  support: { label: "Support", href: "/dashboard/support" },
  settings: { label: "Settings", href: "/settings" },
  account: { label: "Account", href: "/dashboard/account" },
} as const;

export type TradioModuleId = keyof typeof tradioModules;
