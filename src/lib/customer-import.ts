export type CustomerImportSource = "auto" | "quickbooks" | "sage" | "xero";

export type CustomerImportRow = {
  address_line_1: string;
  address_line_2: string;
  email: string;
  issue?: string;
  name: string;
  notes: string;
  phone: string;
  postcode: string;
  rowNumber: number;
  status: "duplicate" | "invalid" | "ready";
  town: string;
};

export type CustomerImportState = {
  detectedSource?: Exclude<CustomerImportSource, "auto">;
  message?: string;
  rows?: CustomerImportRow[];
};

type CsvRecord = Record<string, string>;
type FieldAliases = {
  address1: string[];
  address2: string[];
  company: string[];
  email: string[];
  firstName: string[];
  fullName: string[];
  lastName: string[];
  notes: string[];
  phone: string[];
  postcode: string[];
  town: string[];
};

const common: FieldAliases = {
  address1: ["addressline1", "address1", "street", "billingstreet"],
  address2: ["addressline2", "address2", "county", "billingstate"],
  company: ["company", "companyname", "organisation", "organization"],
  email: ["email", "emailaddress", "email1"],
  firstName: ["firstname", "first"],
  fullName: ["name", "customername", "contactname", "displayname"],
  lastName: ["lastname", "surname", "last"],
  notes: ["notes", "note", "comments"],
  phone: ["phone", "phonenumber", "telephone", "mobile", "mobilenumber"],
  postcode: ["postcode", "postalcode", "zipcode", "zip", "billingzip"],
  town: ["town", "city", "billingcity"],
};

const sourceAliases: Record<Exclude<CustomerImportSource, "auto">, FieldAliases> = {
  xero: {
    ...common,
    address1: ["poaddressline1", "streetaddressline1", ...common.address1],
    address2: ["poaddressline2", "streetaddressline2", ...common.address2],
    company: ["contactname", ...common.company],
    email: ["emailaddress", ...common.email],
    fullName: ["contactname", ...common.fullName],
    phone: ["phonenumber", "mobilephonenumber", ...common.phone],
    postcode: ["poaddresspostalcode", "streetaddresspostalcode", ...common.postcode],
    town: ["poaddresscity", "streetaddresscity", ...common.town],
  },
  quickbooks: {
    ...common,
    address1: ["billingaddress", "billingstreet", ...common.address1],
    company: ["company", "companyname", ...common.company],
    fullName: ["customer", "customerfullname", "displayname", ...common.fullName],
    phone: ["phone", "mobile", ...common.phone],
  },
  sage: {
    ...common,
    address1: ["address1", "addressline1", ...common.address1],
    address2: ["address2", "addressline2", "address3", ...common.address2],
    company: ["companyname", "customername", ...common.company],
    email: ["email", "emailaddress", ...common.email],
    fullName: ["contactname", "customername", ...common.fullName],
    phone: ["telephone", "telephone1", "mobile", ...common.phone],
    postcode: ["postcode", "postcode1", ...common.postcode],
  },
};

export function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizedRecord(record: CsvRecord) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [normalizeHeader(key), String(value ?? "").trim()]),
  );
}

function firstValue(record: CsvRecord, aliases: string[]) {
  for (const alias of aliases) {
    const value = record[normalizeHeader(alias)]?.trim();
    if (value) return value;
  }
  return "";
}

function limit(value: string, length = 500) {
  return value.replace(/\0/g, "").trim().slice(0, length);
}

export function detectCustomerImportSource(
  records: CsvRecord[],
): Exclude<CustomerImportSource, "auto"> {
  const headers = new Set(
    records.flatMap((record) => Object.keys(record).map(normalizeHeader)),
  );

  if (["poaddressline1", "contactstatus", "contactnumber"].some((key) => headers.has(key))) {
    return "xero";
  }
  if (["billingaddress", "customerfullname", "displayname", "billingzip"].some((key) => headers.has(key))) {
    return "quickbooks";
  }
  return "sage";
}

export function mapCustomerImportRecords(
  records: CsvRecord[],
  requestedSource: CustomerImportSource,
) {
  const source = requestedSource === "auto" ? detectCustomerImportSource(records) : requestedSource;
  const aliases = sourceAliases[source];
  const rows = records.slice(0, 500).map((rawRecord, index): CustomerImportRow => {
    const record = normalizedRecord(rawRecord);
    const company = firstValue(record, aliases.company);
    const fullName = firstValue(record, aliases.fullName);
    const personName = [
      firstValue(record, aliases.firstName),
      firstValue(record, aliases.lastName),
    ]
      .filter(Boolean)
      .join(" ");
    const name = limit(company || fullName || personName, 250);
    const email = limit(firstValue(record, aliases.email).toLowerCase(), 320);
    const sourceName = source === "quickbooks" ? "QuickBooks" : source === "xero" ? "Xero" : "Sage";
    const originalNotes = limit(firstValue(record, aliases.notes), 4500);
    const notes = limit(
      [originalNotes, `Imported from ${sourceName}`].filter(Boolean).join("\n"),
      5000,
    );
    let issue = "";

    if (!name) issue = "Customer name was not found";
    else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) issue = "Email address is invalid";

    return {
      address_line_1: limit(firstValue(record, aliases.address1)),
      address_line_2: limit(firstValue(record, aliases.address2)),
      email,
      issue: issue || undefined,
      name,
      notes,
      phone: limit(firstValue(record, aliases.phone), 100),
      postcode: limit(firstValue(record, aliases.postcode).toUpperCase(), 20),
      rowNumber: index + 2,
      status: issue ? "invalid" : "ready",
      town: limit(firstValue(record, aliases.town), 150),
    };
  });

  return { rows, source };
}

export function duplicateKeys(row: Pick<CustomerImportRow, "email" | "name" | "postcode">) {
  const keys = [
    `name:${row.name.toLowerCase().replace(/\s+/g, " ")}|${row.postcode.toUpperCase().replace(/\s+/g, "")}`,
  ];
  if (row.email) keys.push(`email:${row.email.toLowerCase()}`);
  return keys;
}
