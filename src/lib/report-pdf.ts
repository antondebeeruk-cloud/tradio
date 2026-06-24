type ReportStat = {
  label: string;
  value: string;
};

type ReportJob = {
  customerName: string;
  expenses: string;
  income: string;
  margin: string;
  profit: string;
  status: string;
  title: string;
};

type CreateReportPdfInput = {
  businessName: string;
  generatedAt: string;
  jobs: ReportJob[];
  stats: ReportStat[];
  title: string;
  unallocatedCosts: string;
};

function cleanText(value: string) {
  return value
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .slice(0, 100);
}

function textLine(x: number, y: number, size: number, text: string) {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${cleanText(text)}) Tj ET`;
}

function createPageStream(lines: string[]) {
  return lines.join("\n");
}

function addHeader(lines: string[], input: CreateReportPdfInput, page: number) {
  lines.push(textLine(50, 790, 20, input.businessName || "Tradio"));
  lines.push(textLine(50, 765, 15, input.title));
  lines.push(textLine(50, 742, 9, `Generated: ${input.generatedAt}`));
  lines.push(textLine(510, 790, 9, `Page ${page}`));
}

export function createReportPdf(input: CreateReportPdfInput) {
  const pages: string[] = [];
  let pageNumber = 1;
  let lines: string[] = [];

  addHeader(lines, input, pageNumber);

  let y = 700;
  input.stats.slice(0, 12).forEach((stat, index) => {
    const x = index % 2 === 0 ? 50 : 315;

    if (index > 0 && index % 2 === 0) {
      y -= 38;
    }

    lines.push(textLine(x, y, 9, stat.label));
    lines.push(textLine(x, y - 16, 13, stat.value));
  });

  y -= 62;
  lines.push(textLine(50, y, 13, "Job profit dashboard"));
  y -= 26;
  lines.push(textLine(50, y, 9, "Job"));
  lines.push(textLine(240, y, 9, "Status"));
  lines.push(textLine(315, y, 9, "Income"));
  lines.push(textLine(385, y, 9, "Expenses"));
  lines.push(textLine(465, y, 9, "Profit"));
  lines.push(textLine(530, y, 9, "Margin"));
  y -= 18;

  const pushJob = (job: ReportJob) => {
    if (y < 70) {
      pages.push(createPageStream(lines));
      pageNumber += 1;
      lines = [];
      addHeader(lines, input, pageNumber);
      y = 710;
      lines.push(textLine(50, y, 13, "Job profit dashboard continued"));
      y -= 26;
      lines.push(textLine(50, y, 9, "Job"));
      lines.push(textLine(240, y, 9, "Status"));
      lines.push(textLine(315, y, 9, "Income"));
      lines.push(textLine(385, y, 9, "Expenses"));
      lines.push(textLine(465, y, 9, "Profit"));
      lines.push(textLine(530, y, 9, "Margin"));
      y -= 18;
    }

    lines.push(textLine(50, y, 9, job.title));
    lines.push(textLine(50, y - 13, 8, job.customerName));
    lines.push(textLine(240, y, 8, job.status));
    lines.push(textLine(315, y, 8, job.income));
    lines.push(textLine(385, y, 8, job.expenses));
    lines.push(textLine(465, y, 8, job.profit));
    lines.push(textLine(530, y, 8, job.margin));
    y -= 34;
  };

  if (input.jobs.length > 0) {
    input.jobs.forEach(pushJob);
  } else {
    lines.push(textLine(50, y, 10, "No job profit figures yet."));
    y -= 26;
  }

  y -= 8;
  if (y < 70) {
    pages.push(createPageStream(lines));
    pageNumber += 1;
    lines = [];
    addHeader(lines, input, pageNumber);
    y = 710;
  }
  lines.push(textLine(50, y, 10, `Unallocated receipts: ${input.unallocatedCosts}`));
  pages.push(createPageStream(lines));

  const pageCount = pages.length;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${Array.from(
      { length: pageCount },
      (_, index) => `${4 + index * 2} 0 R`,
    ).join(" ")}] /Count ${pageCount} >>`,
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
