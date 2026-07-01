export type TradioRelease = {
  date: string;
  groups: {
    features: string[];
    title: string;
  }[];
  status: "Beta" | "Stable";
  summary: string;
  version: string;
};

// Keep the newest release first so the page always leads with the current version.
export const tradioReleases: TradioRelease[] = [
  {
    date: "1 July 2026",
    status: "Beta",
    summary:
      "Tradio Pro Recurring Work automatically turns regular customer commitments into scheduled jobs and predictable revenue.",
    version: "0.14",
    groups: [
      {
        title: "Recurring jobs and service plans",
        features: [
          "Create weekly, fortnightly, monthly, quarterly and annual service plans.",
          "Generate upcoming jobs and connected calendar visits automatically without duplicates.",
          "Pause, resume or remove recurring work while keeping existing job history.",
          "Set visit times, expected values, locations, notes and service end dates.",
          "Send customers an email reminder before upcoming recurring appointments.",
          "Track active plans and expected recurring monthly revenue from the dashboard.",
          "Run generation and reminders securely from a protected cron endpoint.",
        ],
      },
    ],
  },
  {
    date: "1 July 2026",
    status: "Beta",
    summary:
      "Tradio Pro Purchase Orders connects supplier purchasing directly to jobs and actual profitability.",
    version: "0.13",
    groups: [
      {
        title: "Suppliers and purchase orders",
        features: [
          "Save supplier contact details and create reusable supplier records.",
          "Build purchase orders with multiple quantities, unit costs and VAT rates.",
          "Link orders to jobs and track draft, sent, partially received, received and cancelled statuses.",
          "Download professional purchase order PDFs or email them directly to suppliers.",
          "Convert received order items into job expenses without duplicating costs.",
          "Share purchasing workflows with Pro and Elite workspace team members.",
        ],
      },
    ],
  },
  {
    date: "1 July 2026",
    status: "Beta",
    summary:
      "Tradio Pro Team Access gives busy trade businesses one shared workspace for customers, quotes, invoices, jobs, schedules and files.",
    version: "0.12",
    groups: [
      {
        title: "Team access and shared workspaces",
        features: [
          "Invite a team member by email from a dedicated Team module.",
          "Share customers, leads, quotes, invoices, receipts, jobs and calendar entries without copying records.",
          "Give team members access to private job photos and documents through the same workspace protections.",
          "Include two users on Pro and unlimited workspace seats on Elite.",
          "Keep billing and personal account controls with the workspace owner.",
          "Record recent workspace activity so owners can see who changed shared business records.",
          "Remove a member without deleting their personal Tradio account.",
        ],
      },
    ],
  },
  {
    date: "30 June 2026",
    status: "Beta",
    summary:
      "Tradio Pro Job Files keeps site photos, plans, certificates and documents securely attached to the work they belong to.",
    version: "0.11",
    groups: [
      {
        title: "Job photos and documents",
        features: [
          "Take job photos directly from a phone camera or choose existing files.",
          "Upload up to six private files at once with a 15MB limit per file.",
          "Preview site photos in a responsive gallery with editable captions.",
          "Store and download PDFs, Word files, spreadsheets and text documents.",
          "Open a dedicated files view from every tracked job.",
          "Use temporary signed links so private files are not publicly exposed.",
          "Protect file records and storage objects for active Trial, Pro and Elite accounts.",
        ],
      },
    ],
  },
  {
    date: "29 June 2026",
    status: "Beta",
    summary:
      "Tradio Pro Scheduling adds a connected calendar for planning appointments, job visits, reminders and working time.",
    version: "0.10",
    groups: [
      {
        title: "Pro scheduling and calendar",
        features: [
          "Plan appointments, job visits, reminders and blocked working time.",
          "Navigate a full monthly calendar with a focused upcoming-work list.",
          "Connect schedule entries to existing Tradio customers and jobs.",
          "Show job start dates and deadlines alongside calendar appointments.",
          "Create all-day entries and add times, locations, notes and statuses.",
          "Edit, complete, cancel or delete schedule entries from one module.",
          "Protect scheduling for active Trial, Pro and Elite accounts on both the server and database.",
        ],
      },
    ],
  },
  {
    date: "29 June 2026",
    status: "Beta",
    summary:
      "The first complete Tradio beta brings customer, sales, job, expense, reporting, subscription, and support workflows together for UK tradespeople.",
    version: "0.9",
    groups: [
      {
        title: "Customers, quotes and invoices",
        features: [
          "Create, edit, search and manage customer records.",
          "Build quotes with reusable services and products, VAT calculations and quote statuses.",
          "Convert accepted quotes into invoices and track unpaid, paid and overdue balances.",
          "Export professional quote and invoice PDFs and email them as attachments.",
          "Share customer portal links for quote acceptance and document downloads.",
        ],
      },
      {
        title: "Leads and follow-up",
        features: [
          "Give every account a unique Tradio lead email address.",
          "Collect catch-all mailbox enquiries through secure server-side IMAP syncing.",
          "Extract customer details, phone numbers, postcodes and lead sources from emails.",
          "Convert leads into customers or quotes and manage lead statuses.",
          "Send friendly automated reminders for unpaid invoices.",
        ],
      },
      {
        title: "Jobs, receipts and profitability",
        features: [
          "Create jobs, track progress and connect customers, quotes and invoices.",
          "Capture receipts and supplier invoices from phone photos or uploaded files.",
          "Scan receipt images and PDFs, categorise expenses and allocate costs to jobs.",
          "Compare job income, materials, labour, expenses, profit and margin.",
          "Save job types and working hours for stronger profitability reporting.",
        ],
      },
      {
        title: "Reports and business insight",
        features: [
          "View profit, outstanding payment and quote success reports.",
          "Track monthly revenue, job profitability and best-performing job types.",
          "Review material spending, VAT summaries and time-versus-money figures.",
          "Download individual reports or the complete report pack as PDFs.",
        ],
      },
      {
        title: "Plans, accounts and platform",
        features: [
          "Offer a 14-day trial plus Lite, Pro and Elite monthly or annual packages.",
          "Connect PayPal subscriptions with verified callbacks and cancellation controls.",
          "Provide account export, deletion requests, cookie preferences and legal pages.",
          "Use a responsive phone layout across the customer workspace.",
          "Protect routes and paid features on the server as well as in the interface.",
        ],
      },
    ],
  },
];

export const currentRelease = tradioReleases[0];
