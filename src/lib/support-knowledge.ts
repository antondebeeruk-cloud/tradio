type SupportTopic = {
  answer: string;
  terms: string[];
};

const supportTopics: SupportTopic[] = [
  {
    terms: ["quote", "quotes", "send quote", "create quote", "accepted"],
    answer:
      "To create a quote, open Quotes, choose New quote, select a customer, add line items, then save it. You can mark quotes as draft, sent, accepted, or rejected. Once a quote is accepted, use Convert to invoice to create the invoice.",
  },
  {
    terms: ["invoice", "invoices", "paid", "unpaid", "overdue", "convert"],
    answer:
      "Invoices are created from accepted quotes or from the invoices area. Tradio tracks unpaid, paid, and overdue invoices. Open an invoice to update its status, export a PDF, or email it to the customer.",
  },
  {
    terms: ["lead", "leads", "email", "mailbox", "imap", "bark", "checkatrade", "mybuilder", "facebook"],
    answer:
      "Your lead email is shown on the Leads page. Use that address on Bark, Checkatrade, MyBuilder, Facebook, or other lead sites. When mail arrives in the catch-all mailbox, Tradio reads it, matches the original recipient, and creates a lead in the right account.",
  },
  {
    terms: ["customer", "customers", "contact", "contacts"],
    answer:
      "Use Customers to store names, phone numbers, emails, addresses, and notes. Leads can also be converted into customers, so enquiry details do not need to be typed in again.",
  },
  {
    terms: ["job", "jobs", "tracking", "job tracking"],
    answer:
      "Job Tracking is available on Elite and during the free trial. Use Jobs to link work to a customer, quote, or invoice, then track status, start date, due date, completed date, and notes.",
  },
  {
    terms: ["report", "reports", "revenue", "conversion", "stats"],
    answer:
      "Reports are available on Elite and during the free trial. They show quote totals, accepted quotes, invoices sent, paid invoices, unpaid invoice value, revenue, outstanding value, and quote conversion rate.",
  },
  {
    terms: ["plan", "pricing", "subscription", "trial", "lite", "elite", "paypal", "upgrade"],
    answer:
      "Tradio has a 10 day free trial, Lite, and Elite. Lite includes the core customer, quote, and invoice workflow. Elite adds Reports and Job Tracking. You can review or upgrade your plan from the Account page.",
  },
  {
    terms: ["pdf", "export", "email customer", "attachment", "send email"],
    answer:
      "Quotes and invoices can be exported as professional PDFs. When emailing a customer from Tradio, the PDF is attached so the customer receives the document directly.",
  },
  {
    terms: ["login", "sign up", "signup", "account", "password"],
    answer:
      "Use Sign up to create an account, then choose a package before entering the dashboard. If you already have an account, use Log in. Do not share passwords or API keys in support messages.",
  },
  {
    terms: ["admin", "support access", "client app", "client account"],
    answer:
      "Admin users can access the admin support area for read-only support views and reporting. This should only be used for support purposes and checked server-side.",
  },
];

const fallbackAnswer =
  "I can help with customers, quotes, invoices, leads, PDFs, subscriptions, reports, and jobs. Try asking something like: How do I create a quote? or Why are leads not showing?";

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

export function getBuiltInSupportAnswer(question: string) {
  const normalisedQuestion = normalise(question);
  const topic = supportTopics.find((item) =>
    item.terms.some((term) => normalisedQuestion.includes(normalise(term))),
  );

  return {
    answer: topic?.answer ?? fallbackAnswer,
    matched: Boolean(topic),
  };
}
