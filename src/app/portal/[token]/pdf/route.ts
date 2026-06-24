import { NextResponse } from "next/server";
import { createDocumentPdf } from "@/lib/pdf";
import { getCustomerPortalDocument } from "@/lib/customer-portal-document";

type PortalPdfRouteProps = {
  params: {
    token: string;
  };
};

export async function GET(_request: Request, { params }: PortalPdfRouteProps) {
  const portalDocument = await getCustomerPortalDocument(params.token);

  if (!portalDocument) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const pdf = createDocumentPdf({
    businessProfile: portalDocument.profile,
    customerName: portalDocument.customer?.name ?? "Customer",
    documentLabel: portalDocument.documentLabel,
    documentNumber: portalDocument.documentNumber,
    dueDate: portalDocument.dueDate,
    issueDate: portalDocument.issueDate,
    items: portalDocument.items,
    status: portalDocument.status,
    subtotal: portalDocument.subtotal,
    total: portalDocument.total,
    vatAmount: portalDocument.vatAmount,
    vatRate: portalDocument.vatRate,
  });

  return new NextResponse(pdf, {
    headers: {
      "Content-Disposition": `attachment; filename="${portalDocument.documentNumber}.pdf"`,
      "Content-Type": "application/pdf",
    },
  });
}
