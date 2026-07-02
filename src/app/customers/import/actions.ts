"use server";

import { parse } from "csv-parse/sync";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  type CustomerImportRow,
  type CustomerImportSource,
  type CustomerImportState,
  duplicateKeys,
  mapCustomerImportRecords,
} from "@/lib/customer-import";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function importSource(value: FormDataEntryValue | null): CustomerImportSource {
  return value === "sage" || value === "quickbooks" || value === "xero" ? value : "auto";
}

async function markDuplicates(
  rows: CustomerImportRow[],
  existing: { email: string | null; name: string; postcode: string | null }[],
) {
  const existingKeys = new Set(
    existing.flatMap((customer) => duplicateKeys({
        email: customer.email ?? "",
        name: customer.name,
        postcode: customer.postcode ?? "",
      })),
  );
  const fileKeys = new Set<string>();

  return rows.map((row) => {
    if (row.status === "invalid") return row;
    const keys = duplicateKeys(row);
    if (keys.some((key) => existingKeys.has(key) || fileKeys.has(key))) {
      return { ...row, issue: "Already exists in Tradio or this file", status: "duplicate" as const };
    }
    keys.forEach((key) => fileKeys.add(key));
    return row;
  });
}

export async function previewCustomerImport(
  _previousState: CustomerImportState,
  formData: FormData,
): Promise<CustomerImportState> {
  const file = formData.get("customer_file");
  if (!(file instanceof File) || file.size === 0) {
    return { message: "Choose a Sage, QuickBooks or Xero CSV file." };
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { message: "The customer export must be a CSV file." };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { message: "The CSV file must be smaller than 2MB." };
  }

  try {
    const records = parse(await file.text(), {
      bom: true,
      columns: true,
      relax_column_count: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    if (records.length === 0) return { message: "No customer rows were found in this file." };
    if (records.length > 500) return { message: "Import up to 500 customers at a time." };

    const { supabase, user } = await requireUser();
    const { rows, source } = mapCustomerImportRecords(records, importSource(formData.get("source")));
    const { data: existing, error } = await supabase
      .from("customers")
      .select("name, email, postcode")
      .eq("user_id", user.id);

    if (error) return { message: error.message };
    return {
      detectedSource: source,
      rows: await markDuplicates(rows, existing ?? []),
    };
  } catch (error) {
    return {
      message: error instanceof Error
        ? `The CSV could not be read: ${error.message}`
        : "The CSV could not be read.",
    };
  }
}

export async function importCustomers(formData: FormData) {
  const { supabase, user } = await requireUser();
  const encodedRows = formData.get("rows");
  if (typeof encodedRows !== "string" || encodedRows.length > 750_000) {
    redirect(`/customers/import?message=${encodeURIComponent("Import preview expired. Upload the CSV again.")}`);
  }

  let submittedRows: CustomerImportRow[];
  try {
    submittedRows = JSON.parse(encodedRows) as CustomerImportRow[];
  } catch {
    redirect(`/customers/import?message=${encodeURIComponent("Import preview was invalid. Upload the CSV again.")}`);
  }

  if (!Array.isArray(submittedRows) || submittedRows.length > 500) {
    redirect(`/customers/import?message=${encodeURIComponent("Import up to 500 customers at a time.")}`);
  }

  const safeRows = submittedRows
    .filter((row) => {
      if (!row || row.status !== "ready" || typeof row.name !== "string" || !row.name.trim()) return false;
      const email = String(row.email || "").trim();
      return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    })
    .map((row) => ({
      user_id: user.id,
      name: String(row.name).trim().slice(0, 250),
      email: String(row.email || "").trim().toLowerCase().slice(0, 320) || null,
      phone: String(row.phone || "").trim().slice(0, 100) || null,
      address_line_1: String(row.address_line_1 || "").trim().slice(0, 500) || null,
      address_line_2: String(row.address_line_2 || "").trim().slice(0, 500) || null,
      town: String(row.town || "").trim().slice(0, 150) || null,
      postcode: String(row.postcode || "").trim().toUpperCase().slice(0, 20) || null,
      notes: String(row.notes || "").trim().slice(0, 5000) || null,
    }));

  const { data: existing } = await supabase
    .from("customers")
    .select("name, email, postcode")
    .eq("user_id", user.id);
  const existingKeys = new Set(
    (existing ?? []).flatMap((customer) => duplicateKeys({
        email: customer.email ?? "",
        name: customer.name,
        postcode: customer.postcode ?? "",
      })),
  );
  const seen = new Set<string>();
  const importable = safeRows.filter((row) => {
    const keys = duplicateKeys({
      email: row.email ?? "",
      name: row.name,
      postcode: row.postcode ?? "",
    });
    if (keys.some((key) => existingKeys.has(key) || seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });

  if (importable.length === 0) {
    redirect(`/customers/import?message=${encodeURIComponent("No new valid customers were available to import.")}`);
  }

  const { error } = await supabase.from("customers").insert(importable);
  if (error) redirect(`/customers/import?message=${encodeURIComponent(error.message)}`);

  revalidatePath("/customers");
  revalidatePath("/quotes/new");
  const skipped = submittedRows.length - importable.length;
  redirect(`/customers?message=${encodeURIComponent(`${importable.length} customer${importable.length === 1 ? "" : "s"} imported${skipped ? `, ${skipped} skipped` : ""}.`)}`);
}
