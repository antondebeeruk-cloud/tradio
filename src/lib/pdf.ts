import { currency, formatDate } from "@/lib/documents";

type PdfItem = {
  description: string;
  quantity: number | string;
  unit_price: number | string;
  line_total: number | string;
};

type PdfBusinessProfile = {
  business_address_line_1?: string | null;
  business_address_line_2?: string | null;
  business_name?: string | null;
  business_postcode?: string | null;
  business_town?: string | null;
  phone?: string | null;
  trade?: string | null;
  vat_number?: string | null;
};

type CreateDocumentPdfInput = {
  businessProfile?: PdfBusinessProfile | null;
  customerName: string;
  documentLabel: string;
  documentNumber: string;
  dueDate?: string | null;
  issueDate: string | null;
  items: PdfItem[];
  status: string;
  subtotal: number | null;
  total: number | null;
  vatAmount: number | null;
  vatRate: number | null;
};

function cleanText(value: string) {
  return value
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .slice(0, 96);
}

function textLine(x: number, y: number, size: number, text: string) {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${cleanText(text)}) Tj ET`;
}

export function createDocumentPdf({
  businessProfile,
  customerName,
  documentLabel,
  documentNumber,
  dueDate,
  issueDate,
  items,
  status,
  subtotal,
  total,
  vatAmount,
  vatRate,
}: CreateDocumentPdfInput) {
  const businessName = businessProfile?.business_name || "Tradio";
  const businessDetails = [
    businessProfile?.trade,
    businessProfile?.phone,
    businessProfile?.business_address_line_1,
    businessProfile?.business_address_line_2,
    businessProfile?.business_town,
    businessProfile?.business_postcode,
    businessProfile?.vat_number
      ? `VAT number: ${businessProfile.vat_number}`
      : null,
  ].filter((detail): detail is string => Boolean(detail));

  const lines = [
    textLine(50, 790, 22, businessName),
    textLine(420, 790, 18, documentLabel),
    textLine(420, 765, 13, documentNumber),
    ...businessDetails
      .slice(0, 6)
      .map((detail, index) => textLine(50, 765 - index * 15, 9, detail)),
    textLine(50, 665, 11, `Customer: ${customerName}`),
    textLine(50, 645, 11, `Status: ${status}`),
    textLine(50, 625, 11, `Issued: ${formatDate(issueDate)}`),
    dueDate ? textLine(50, 605, 11, `Due: ${formatDate(dueDate)}`) : "",
    textLine(50, 555, 12, "Description"),
    textLine(315, 555, 12, "Qty"),
    textLine(380, 555, 12, "Unit"),
    textLine(470, 555, 12, "Total"),
  ].filter(Boolean);

  let y = 530;
  items.slice(0, 18).forEach((item) => {
    lines.push(textLine(50, y, 10, item.description));
    lines.push(textLine(315, y, 10, String(item.quantity)));
    lines.push(textLine(380, y, 10, currency(Number(item.unit_price))));
    lines.push(textLine(470, y, 10, currency(Number(item.line_total))));
    y -= 22;
  });

  lines.push(textLine(360, 145, 11, "Subtotal"));
  lines.push(textLine(470, 145, 11, currency(subtotal)));
  lines.push(textLine(360, 125, 11, `VAT (${vatRate ?? 0}%)`));
  lines.push(textLine(470, 125, 11, currency(vatAmount)));
  lines.push(textLine(360, 95, 14, "Total"));
  lines.push(textLine(470, 95, 14, currency(total)));

  const stream = lines.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}
