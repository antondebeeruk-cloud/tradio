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
    version: "0.20",
    summary: "Tradio Mobile brings the shared trade workspace into native iPhone and Android apps with secure phone integrations.",
    groups: [{ title: "Native iPhone and Android foundation", features: [
      "Open the complete Tradio workspace inside a branded native phone app.",
      "Share live customers, leads, quotes, invoices, jobs and reports with the existing web account.",
      "Use native phone location permission for Fuel & Mileage tracking.",
      "Keep browser GPS as a fallback for people using Tradio on the web.",
      "Open secure Tradio deep links through the native app URL scheme.",
      "Include Tradio app icons, launch screens and camera and location privacy descriptions.",
      "Show Android and iPhone download controls on the public landing page.",
      "Provide secure VPS tooling for signing and publishing Android beta releases.",
      "Provide Android Studio and Xcode projects ready for device testing and store signing."
    ] }]
  },
  {
    date: "1 July 2026", status: "Beta", version: "0.19",
    summary: "Tradio Fuel & Mileage gives trade businesses a shared vehicle logbook with customer-linked trips and phone GPS tracking.",
    groups: [{ title: "Fuel and mileage logbook", features: [
      "Add business vehicles with registration, make, model, fuel type and odometer.",
      "Record fuel purchases, litres or energy, cost, station and mileage.",
      "Log manual trips with leaving and arriving destinations.",
      "Select a customer to use their saved address as the destination.",
      "Track live phone GPS mileage while the tracking screen remains open.",
      "Save timestamped route points securely to the shared workspace.",
      "Show total logged mileage, fuel spending and recent trip history."
    ] }]
  },
  {
    date: "1 July 2026",
    status: "Beta",
    summary: "Tradio Job Maps puts each customer location and phone-friendly directions directly beside the work it belongs to.",
    version: "0.18",
    groups: [{ title: "Job maps and directions", features: [
      "Build each job location from the customer address and postcode already stored in Tradio.",
      "Open an interactive map directly from the job card.",
      "Launch turn-by-turn directions in Google Maps with one tap.",
      "Lazy-load maps only when requested to reduce page weight and unnecessary third-party requests.",
      "Show a clear prompt when a customer still needs an address."
    ] }]
  },
  {
    date: "1 July 2026",
    status: "Beta",
    summary: "Tradio Account Security lets signed-in users change their password safely from Settings.",
    version: "0.17",
    groups: [{ title: "Account password controls", features: [
      "Change a login password directly from the Settings module.",
      "Require the current password before accepting a new one.",
      "Confirm the new password and enforce an eight-character minimum.",
      "Reject reuse of the current password.",
      "Keep team-member password changes separate from workspace ownership and billing."
    ] }]
  },
  {
    date: "1 July 2026",
    status: "Beta",
    summary: "Tradio Password Recovery lets users securely regain access without support intervention or risking their business profile data.",
    version: "0.16",
    groups: [{ title: "Password recovery", features: [
      "Request a secure password reset link directly from the login page.",
      "Use privacy-friendly responses that do not reveal whether an email is registered.",
      "Open a session-protected password reset page from the email callback.",
      "Confirm a new password with an eight-character minimum.",
      "Reject expired or invalid recovery links with a clear route to try again.",
      "Preserve existing names, business details and lead addresses during recovery.",
      "Sign out after a successful reset so the new password is used for the next login."
    ] }]
  },
  {
    date: "1 July 2026",
    status: "Beta",
    summary: "Tradio Job Completion Reports create a secure customer acceptance record with touchscreen signatures and signed PDFs.",
    version: "0.15",
    groups: [{
      title: "Completion reports and customer signatures",
      features: [
        "Prepare completion summaries, work performed, materials and recommendations from each job.",
        "Send customers a secure signing link by email.",
        "Capture touchscreen or mouse signatures with the customer name.",
        "Record acceptance time and request IP before locking the report.",
        "Automatically mark an accepted job as completed.",
        "Download a professional signed completion PDF with a permanent acceptance reference.",
        "Keep existing job photos connected to the completion workflow."
      ]
    }]
  },
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
