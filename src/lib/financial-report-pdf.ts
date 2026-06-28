type PdfStat = {
  label: string;
  value: string;
};

type PdfColumn = {
  label: string;
  x: number;
};

type PdfSection = {
  columns: PdfColumn[];
  rows: string[][];
  title: string;
};

type FinancialReportPdfInput = {
  businessName: string;
  generatedAt: string;
  sections: PdfSection[];
  stats: PdfStat[];
  title: string;
};

function cleanText(value: string) {
  return value
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .slice(0, 70);
}

function textLine(x: number, y: number, size: number, value: string) {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${cleanText(value)}) Tj ET`;
}

function addHeader(
  lines: string[],
  input: FinancialReportPdfInput,
  pageNumber: number,
) {
  lines.push(textLine(50, 790, 20, input.businessName || "Tradio"));
  lines.push(textLine(50, 765, 15, input.title));
  lines.push(textLine(50, 742, 9, `Generated: ${input.generatedAt}`));
  lines.push(textLine(510, 790, 9, `Page ${pageNumber}`));
}

export function createFinancialReportPdf(input: FinancialReportPdfInput) {
  const pages: string[] = [];
  let pageNumber = 1;
  let lines: string[] = [];
  let y = 700;

  const startPage = () => {
    lines = [];
    addHeader(lines, input, pageNumber);
    y = 700;
  };

  const finishPage = () => {
    pages.push(lines.join("\n"));
    pageNumber += 1;
    startPage();
  };

  startPage();

  input.stats.slice(0, 10).forEach((stat, index) => {
    const x = index % 2 === 0 ? 50 : 315;

    if (index > 0 && index % 2 === 0) {
      y -= 38;
    }

    lines.push(textLine(x, y, 9, stat.label));
    lines.push(textLine(x, y - 16, 13, stat.value));
  });
  y -= 65;

  input.sections.forEach((section) => {
    const addSectionHeading = (continued = false) => {
      lines.push(
        textLine(
          50,
          y,
          13,
          `${section.title}${continued ? " continued" : ""}`,
        ),
      );
      y -= 24;
      section.columns.forEach((column) => {
        lines.push(textLine(column.x, y, 9, column.label));
      });
      y -= 18;
    };

    if (y < 140) {
      finishPage();
    }

    addSectionHeading();

    if (section.rows.length === 0) {
      lines.push(textLine(50, y, 9, "No matching records."));
      y -= 30;
      return;
    }

    section.rows.forEach((row) => {
      if (y < 65) {
        finishPage();
        addSectionHeading(true);
      }

      section.columns.forEach((column, index) => {
        lines.push(textLine(column.x, y, 8, row[index] ?? ""));
      });
      y -= 20;
    });
    y -= 18;
  });

  pages.push(lines.join("\n"));

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages
      .map((_, index) => `${4 + index * 2} 0 R`)
      .join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  pages.forEach((stream, index) => {
    const pageObjectId = 4 + index * 2;
    const contentObjectId = pageObjectId + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    );
    objects.push(
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    );
  });

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
