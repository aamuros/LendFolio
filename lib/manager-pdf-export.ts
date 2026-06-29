import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { borrowerVerificationDocumentTypeLabels } from "@/lib/borrower-verification";
import { lenderVerificationDocumentTypeLabels } from "@/lib/lender-verification";
import {
  getShortId,
  managerStatusLabels,
  type ManagerBorrowerVerificationRow,
  type ManagerLenderRow,
} from "@/lib/manager-operations";
import { formatDateOnly, formatDateTime } from "@/lib/manager-date-format";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 13;

const colors = {
  ink: rgb(0.12, 0.16, 0.14),
  muted: rgb(0.38, 0.42, 0.39),
  line: rgb(0.82, 0.84, 0.82),
  soft: rgb(0.95, 0.96, 0.95),
  brand: rgb(0.1, 0.28, 0.2),
};

type PdfContext = {
  pdf: PDFDocument;
  page: PDFPage;
  regular: PDFFont;
  bold: PDFFont;
  y: number;
};

type Field = {
  label: string;
  value: string | number | null | undefined;
};

const moneyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

function formatMoney(value: number | null | undefined) {
  return typeof value === "number" ? moneyFormatter.format(value) : "N/A";
}

function present(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
}

function statusLabel(value: string | null | undefined) {
  if (!value) return "N/A";
  return managerStatusLabels[value as keyof typeof managerStatusLabels] ?? value;
}

function confidenceLabel(value: number | null | undefined) {
  if (typeof value !== "number") return "N/A";
  return `${Math.round(value * 100)}%`;
}

export function buildManagerExportFilename(
  type: "approved-lender" | "approved-borrower",
  name: string,
  generatedAt = new Date(),
) {
  const safeName =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "record";
  const date = generatedAt.toISOString().slice(0, 10);
  return `lendfolio-${type}-${safeName}-${date}.pdf`;
}

async function createContext() {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  return { pdf, page, regular, bold, y: PAGE_HEIGHT - MARGIN };
}

function addPage(ctx: PdfContext) {
  ctx.page = ctx.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.y = PAGE_HEIGHT - MARGIN;
}

function ensureSpace(ctx: PdfContext, needed: number) {
  if (ctx.y - needed < MARGIN + 24) addPage(ctx);
}

function drawText(
  ctx: PdfContext,
  text: string,
  x: number,
  y: number,
  options: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> } = {},
) {
  ctx.page.drawText(text, {
    x,
    y,
    size: options.size ?? 9,
    font: options.font ?? ctx.regular,
    color: options.color ?? colors.ink,
  });
}

function wrapText(text: string, font: PDFFont, size: number, width: number) {
  const words = present(text).replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }

  if (line) lines.push(line);
  return lines.length ? lines : ["N/A"];
}

function drawHeader(ctx: PdfContext, title: string, reportId: string, generatedAt: Date) {
  drawText(ctx, "LendFolio", MARGIN, ctx.y, {
    size: 18,
    font: ctx.bold,
    color: colors.brand,
  });
  drawText(ctx, title, MARGIN, ctx.y - 19, { size: 12, font: ctx.bold });
  drawText(ctx, `Generated: ${formatDateTime(generatedAt.toISOString())}`, MARGIN, ctx.y - 36, {
    size: 8,
    color: colors.muted,
  });
  drawText(ctx, `Report ID: ${reportId}`, MARGIN, ctx.y - 48, {
    size: 8,
    color: colors.muted,
  });
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y - 62 },
    end: { x: PAGE_WIDTH - MARGIN, y: ctx.y - 62 },
    thickness: 1,
    color: colors.line,
  });
  ctx.y -= 82;
}

function drawSectionTitle(ctx: PdfContext, title: string) {
  ensureSpace(ctx, 30);
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 18,
    width: CONTENT_WIDTH,
    height: 20,
    color: colors.soft,
  });
  drawText(ctx, title, MARGIN + 8, ctx.y - 12, { size: 10, font: ctx.bold });
  ctx.y -= 32;
}

function drawFields(ctx: PdfContext, fields: Field[], columns = 2) {
  const gap = 14;
  const colWidth = (CONTENT_WIDTH - gap * (columns - 1)) / columns;

  for (let index = 0; index < fields.length; index += columns) {
    const row = fields.slice(index, index + columns);
    const rowLines = row.map((field) =>
      wrapText(present(field.value), ctx.regular, 9, colWidth),
    );
    const rowHeight =
      20 + Math.max(...rowLines.map((lines) => lines.length)) * LINE_HEIGHT;
    ensureSpace(ctx, rowHeight);

    row.forEach((field, offset) => {
      const x = MARGIN + offset * (colWidth + gap);
      drawText(ctx, field.label, x, ctx.y, {
        size: 7.5,
        font: ctx.bold,
        color: colors.muted,
      });
      rowLines[offset].forEach((line, lineIndex) => {
        drawText(ctx, line, x, ctx.y - 13 - lineIndex * LINE_HEIGHT, { size: 9 });
      });
    });

    ctx.y -= rowHeight;
  }
}

function drawDocumentsTable(
  ctx: PdfContext,
  headers: string[],
  rows: string[][],
) {
  const widths = headers.map(() => CONTENT_WIDTH / headers.length);
  const size = headers.length > 7 ? 6.2 : 6.8;

  ensureSpace(ctx, 28);
  headers.forEach((header, index) => {
    drawText(ctx, header, MARGIN + widths[0] * index, ctx.y, {
      size,
      font: ctx.bold,
      color: colors.muted,
    });
  });
  ctx.y -= 14;

  if (rows.length === 0) {
    drawText(ctx, "No documents uploaded.", MARGIN, ctx.y, { size: 9 });
    ctx.y -= 20;
    return;
  }

  rows.forEach((row) => {
    const wrapped = row.map((cell, index) =>
      wrapText(cell, ctx.regular, size, widths[index] - 5).slice(0, 4),
    );
    const rowHeight = Math.max(...wrapped.map((lines) => lines.length)) * 9 + 8;
    ensureSpace(ctx, rowHeight + 14);
    ctx.page.drawLine({
      start: { x: MARGIN, y: ctx.y + 6 },
      end: { x: PAGE_WIDTH - MARGIN, y: ctx.y + 6 },
      thickness: 0.5,
      color: colors.line,
    });

    wrapped.forEach((lines, index) => {
      lines.forEach((line, lineIndex) => {
        drawText(ctx, line, MARGIN + widths[0] * index, ctx.y - lineIndex * 9, {
          size,
        });
      });
    });
    ctx.y -= rowHeight;
  });
}

function drawPageNumbers(ctx: PdfContext) {
  const pages = ctx.pdf.getPages();
  pages.forEach((page, index) => {
    page.drawText(`Page ${index + 1} of ${pages.length}`, {
      x: PAGE_WIDTH - MARGIN - 58,
      y: 24,
      size: 8,
      font: ctx.regular,
      color: colors.muted,
    });
  });
}

export async function generateApprovedLenderPdf(lender: ManagerLenderRow) {
  const ctx = await createContext();
  const generatedAt = new Date();
  drawHeader(
    ctx,
    "Approved Lender Details Report",
    `LDR-${getShortId(lender.id)}-${generatedAt.getTime().toString(36).toUpperCase()}`,
    generatedAt,
  );

  drawSectionTitle(ctx, "Status");
  drawFields(ctx, [
    { label: "Verification Status", value: statusLabel(lender.verificationStatus) },
    { label: "Approved At", value: lender.approvedAt ? formatDateTime(lender.approvedAt) : "N/A" },
    { label: "Approved By", value: lender.approvedBy?.displayName },
  ]);

  drawSectionTitle(ctx, "Lender Identity");
  drawFields(ctx, [
    { label: "Organization Name", value: lender.organizationName },
    { label: "Contact Person", value: lender.contactPerson },
    { label: "Phone Number", value: lender.phoneNumber },
    { label: "Business Registration Number", value: lender.businessRegistrationNumber },
  ]);

  drawSectionTitle(ctx, "Business Address");
  drawFields(ctx, [
    { label: "Business Address", value: lender.businessAddress },
    { label: "Region", value: lender.addressRegion },
    { label: "City / Municipality", value: lender.addressCityOrMunicipality },
    { label: "Barangay", value: lender.addressBarangay },
    { label: "ZIP Code", value: lender.addressZipCode },
    { label: "Operating Area", value: lender.operatingArea },
  ]);

  drawSectionTitle(ctx, "Lending Configuration");
  drawFields(ctx, [
    { label: "Minimum Loan Amount", value: formatMoney(lender.minLoanAmount) },
    { label: "Maximum Loan Amount", value: formatMoney(lender.maxLoanAmount) },
    { label: "Typical Repayment Terms", value: lender.typicalRepaymentTerms },
    { label: "Lender Description", value: lender.lenderDescription },
  ]);

  drawSectionTitle(ctx, "Review");
  drawFields(ctx, [
    { label: "Manager Review Notes", value: lender.managerReviewNotes },
    { label: "Created At", value: formatDateTime(lender.createdAt) },
    { label: "Updated At", value: formatDateTime(lender.updatedAt) },
  ]);

  drawSectionTitle(ctx, "Documents");
  drawDocumentsTable(
    ctx,
    ["Document Type", "File Name", "Status", "Uploaded At", "AI Review", "AI Confidence", "Risk Flags"],
    lender.documents.map((doc) => [
      lenderVerificationDocumentTypeLabels[doc.documentType] ?? doc.documentType,
      doc.fileName,
      statusLabel(doc.status),
      formatDateTime(doc.uploadedAt),
      statusLabel(doc.aiReview.aiReviewStatus),
      confidenceLabel(doc.aiReview.aiReviewConfidence),
      doc.aiReview.aiRiskFlags.length ? doc.aiReview.aiRiskFlags.join(", ") : "N/A",
    ]),
  );

  drawPageNumbers(ctx);
  return ctx.pdf.save();
}

export async function generateApprovedBorrowerPdf(
  verification: ManagerBorrowerVerificationRow,
) {
  const ctx = await createContext();
  const generatedAt = new Date();
  const portfolio = verification.portfolio;

  drawHeader(
    ctx,
    "Approved Borrower Details Report",
    `BWR-${getShortId(verification.id)}-${generatedAt.getTime().toString(36).toUpperCase()}`,
    generatedAt,
  );

  drawSectionTitle(ctx, "Status");
  drawFields(ctx, [
    { label: "Verification Status", value: statusLabel(verification.verificationStatus) },
    { label: "Reviewed At", value: verification.reviewedAt ? formatDateTime(verification.reviewedAt) : "N/A" },
    { label: "Reviewed By", value: verification.reviewedBy?.displayName },
  ]);

  drawSectionTitle(ctx, "Borrower Identity");
  drawFields(ctx, [
    { label: "Borrower Name", value: verification.borrower.displayName },
    { label: "Borrower ID", value: verification.borrower.id },
  ]);

  drawSectionTitle(ctx, "Business Profile");
  drawFields(ctx, [
    { label: "Business Name", value: portfolio?.business_name },
    { label: "Business Type", value: portfolio?.business_type },
    { label: "Business Description", value: portfolio?.business_description },
    { label: "Started Operating At", value: portfolio?.started_operating_at ? formatDateOnly(portfolio.started_operating_at) : "N/A" },
    { label: "Years in Operation", value: portfolio?.years_in_operation },
    { label: "Operating Model", value: portfolio?.operating_model },
    { label: "Primary Sales Channel", value: portfolio?.primary_sales_channel },
  ]);

  drawSectionTitle(ctx, "Business Location");
  drawFields(ctx, [
    { label: "Business Address", value: portfolio?.business_address },
    { label: "Barangay", value: portfolio?.barangay },
    { label: "City / Municipality", value: portfolio?.city_or_municipality },
    { label: "Province", value: portfolio?.province },
    { label: "Region", value: portfolio?.region },
    { label: "ZIP Code", value: portfolio?.zip_code },
    { label: "Location", value: portfolio?.location },
  ]);

  drawSectionTitle(ctx, "Financial Snapshot");
  drawFields(ctx, [
    { label: "Revenue Period", value: portfolio?.revenue_period },
    { label: "Revenue Confidence", value: portfolio?.revenue_confidence },
    { label: "Monthly Gross Revenue", value: formatMoney(portfolio?.monthly_gross_revenue) },
    { label: "Monthly Expenses", value: formatMoney(portfolio?.monthly_expenses) },
    { label: "Existing Loan Payments", value: formatMoney(portfolio?.existing_loan_payments) },
  ]);

  drawSectionTitle(ctx, "Review");
  drawFields(ctx, [
    { label: "Manager Review Notes", value: verification.managerReviewNotes },
    { label: "Submitted At", value: verification.submittedAt ? formatDateTime(verification.submittedAt) : "N/A" },
    { label: "Created At", value: formatDateTime(verification.createdAt) },
    { label: "Reviewed At", value: verification.reviewedAt ? formatDateTime(verification.reviewedAt) : "N/A" },
  ]);

  drawSectionTitle(ctx, "Documents");
  drawDocumentsTable(
    ctx,
    [
      "Document Type",
      "File Name",
      "Status",
      "Uploaded At",
      "AI Review",
      "AI Confidence",
      "Risk Flags",
      "Review Notes",
    ],
    verification.documents.map((doc) => [
      borrowerVerificationDocumentTypeLabels[doc.documentType] ?? doc.documentType,
      doc.fileName,
      statusLabel(doc.status),
      formatDateTime(doc.uploadedAt),
      statusLabel(doc.aiReview.aiReviewStatus),
      confidenceLabel(doc.aiReview.aiReviewConfidence),
      doc.aiReview.aiRiskFlags.length ? doc.aiReview.aiRiskFlags.join(", ") : "N/A",
      present(doc.reviewNotes),
    ]),
  );

  drawPageNumbers(ctx);
  return ctx.pdf.save();
}
