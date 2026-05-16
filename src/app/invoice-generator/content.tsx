"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { jsPDF } from "jspdf";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment } from "@/components/tools/controls";

const ACCENT = "#f43f5e";

// --- Types ---

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

type DocumentType = "invoice" | "quote" | "credit_note";
type PaymentTerm = "receipt" | "net15" | "net30" | "net60" | "net90" | "custom";

interface InvoiceData {
  // Document type
  documentType: DocumentType;
  // Sender
  senderName: string;
  senderEmail: string;
  senderAddress: string;
  senderPhone: string;
  // Recipient
  recipientName: string;
  recipientEmail: string;
  recipientAddress: string;
  // Invoice details
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  paymentTerm: PaymentTerm;
  // Line items
  items: LineItem[];
  // Extras
  taxRate: number;
  discountRate: number;
  notes: string;
  // Template
  template: TemplateName;
}

type TemplateName = "clean" | "modern" | "classic" | "minimal" | "bold";

// --- Currency options (30+ major currencies, common ones first) ---

const currencies = [
  // Common
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "\u20AC", name: "Euro" },
  { code: "GBP", symbol: "\u00A3", name: "British Pound" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "JPY", symbol: "\u00A5", name: "Japanese Yen" },
  { code: "INR", symbol: "\u20B9", name: "Indian Rupee" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  // Europe
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "DKK", symbol: "kr", name: "Danish Krone" },
  { code: "PLN", symbol: "z\u0142", name: "Polish Zloty" },
  { code: "CZK", symbol: "K\u010D", name: "Czech Koruna" },
  { code: "HUF", symbol: "Ft", name: "Hungarian Forint" },
  { code: "TRY", symbol: "\u20BA", name: "Turkish Lira" },
  // Asia-Pacific
  { code: "CNY", symbol: "\u00A5", name: "Chinese Yuan" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { code: "KRW", symbol: "\u20A9", name: "South Korean Won" },
  { code: "THB", symbol: "\u0E3F", name: "Thai Baht" },
  { code: "TWD", symbol: "NT$", name: "Taiwan Dollar" },
  { code: "PHP", symbol: "\u20B1", name: "Philippine Peso" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  { code: "VND", symbol: "\u20AB", name: "Vietnamese Dong" },
  { code: "PKR", symbol: "\u20A8", name: "Pakistani Rupee" },
  // Middle East
  { code: "AED", symbol: "AED", name: "UAE Dirham" },
  { code: "SAR", symbol: "SAR", name: "Saudi Riyal" },
  { code: "ILS", symbol: "\u20AA", name: "Israeli Shekel" },
  // Africa
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "NGN", symbol: "\u20A6", name: "Nigerian Naira" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "EGP", symbol: "E\u00A3", name: "Egyptian Pound" },
  // Americas
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { code: "CLP", symbol: "CL$", name: "Chilean Peso" },
  { code: "COP", symbol: "COL$", name: "Colombian Peso" },
  { code: "PEN", symbol: "S/", name: "Peruvian Sol" },
  { code: "ARS", symbol: "AR$", name: "Argentine Peso" },
];

// --- Payment terms ---

const paymentTerms: { value: PaymentTerm; label: string; days: number | null }[] = [
  { value: "receipt", label: "Due on Receipt", days: 0 },
  { value: "net15", label: "Net 15", days: 15 },
  { value: "net30", label: "Net 30", days: 30 },
  { value: "net60", label: "Net 60", days: 60 },
  { value: "net90", label: "Net 90", days: 90 },
  { value: "custom", label: "Custom", days: null },
];

// --- Document type labels ---

const documentTypeLabels: Record<DocumentType, { label: string; pdfTitle: string; prefix: string }> = {
  invoice: { label: "Invoice", pdfTitle: "INVOICE", prefix: "INV" },
  quote: { label: "Quote", pdfTitle: "QUOTE", prefix: "QUO" },
  credit_note: { label: "Credit Note", pdfTitle: "CREDIT NOTE", prefix: "CN" },
};

// --- Helpers ---

function makeId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function emptyItem(): LineItem {
  return { id: makeId(), description: "", quantity: 1, rate: 0 };
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// --- Auto-increment numbering ---

const COUNTER_KEY = "kami_invoice_counter";

function getNextNumber(prefix: string): string {
  if (typeof window === "undefined") return `${prefix}-000001`;
  try {
    const raw = localStorage.getItem(COUNTER_KEY);
    const counter = raw ? JSON.parse(raw) : {};
    const current = counter[prefix] || 0;
    return `${prefix}-${String(current + 1).padStart(6, "0")}`;
  } catch {
    return `${prefix}-000001`;
  }
}

function incrementCounter(prefix: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(COUNTER_KEY);
    const counter = raw ? JSON.parse(raw) : {};
    const current = counter[prefix] || 0;
    counter[prefix] = current + 1;
    localStorage.setItem(COUNTER_KEY, JSON.stringify(counter));
  } catch {}
}

function defaultInvoice(docType: DocumentType = "invoice"): InvoiceData {
  const info = documentTypeLabels[docType];
  return {
    documentType: docType,
    senderName: "",
    senderEmail: "",
    senderAddress: "",
    senderPhone: "",
    recipientName: "",
    recipientEmail: "",
    recipientAddress: "",
    invoiceNumber: getNextNumber(info.prefix),
    invoiceDate: todayStr(),
    dueDate: "",
    currency: "USD",
    paymentTerm: "custom",
    items: [emptyItem()],
    taxRate: 0,
    discountRate: 0,
    notes: "",
    template: "clean",
  };
}

function getCurrencySymbol(code: string): string {
  return currencies.find((c) => c.code === code)?.symbol ?? code;
}

function formatMoney(amount: number, currency: string): string {
  const sym = getCurrencySymbol(currency);
  return `${sym}${Math.abs(amount).toFixed(2)}`;
}

// --- Local storage for sender defaults ---

const STORAGE_KEY = "kami_invoice_sender";

function loadSenderDefaults(): Partial<InvoiceData> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveSenderDefaults(data: InvoiceData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        senderName: data.senderName,
        senderEmail: data.senderEmail,
        senderAddress: data.senderAddress,
        senderPhone: data.senderPhone,
        currency: data.currency,
      })
    );
  } catch {}
}

// --- Template color schemes ---

const templateStyles: Record<
  TemplateName,
  { primary: string; accent: string; headerBg: [number, number, number]; headerText: [number, number, number]; label: string }
> = {
  clean: {
    primary: "#1f2937",
    accent: "#6366f1",
    headerBg: [99, 102, 241],
    headerText: [255, 255, 255],
    label: "Clean",
  },
  modern: {
    primary: "#0f172a",
    accent: "#0ea5e9",
    headerBg: [14, 165, 233],
    headerText: [255, 255, 255],
    label: "Modern",
  },
  classic: {
    primary: "#1a1a1a",
    accent: "#374151",
    headerBg: [55, 65, 81],
    headerText: [255, 255, 255],
    label: "Classic",
  },
  minimal: {
    primary: "#111827",
    accent: "#9ca3af",
    headerBg: [249, 250, 251],
    headerText: [17, 24, 39],
    label: "Minimal",
  },
  bold: {
    primary: "#1e1b4b",
    accent: "#dc2626",
    headerBg: [220, 38, 38],
    headerText: [255, 255, 255],
    label: "Bold",
  },
};

// --- PDF Generation ---

function generatePDF(data: InvoiceData) {
  const doc = new jsPDF();
  const style = templateStyles[data.template];
  const sym = getCurrencySymbol(data.currency);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const isCreditNote = data.documentType === "credit_note";
  const docInfo = documentTypeLabels[data.documentType];

  // Header bar
  doc.setFillColor(style.headerBg[0], style.headerBg[1], style.headerBg[2]);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(style.headerText[0], style.headerText[1], style.headerText[2]);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(docInfo.pdfTitle, margin, 27);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`#${data.invoiceNumber}`, pageWidth - margin, 20, { align: "right" });
  if (data.invoiceDate) {
    doc.text(`Date: ${data.invoiceDate}`, pageWidth - margin, 27, { align: "right" });
  }
  if (data.dueDate) {
    doc.text(`Due: ${data.dueDate}`, pageWidth - margin, 34, { align: "right" });
  }

  // From / To section
  let y = 55;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("FROM", margin, y);
  doc.text("TO", margin + contentWidth / 2 + 5, y);

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const fromLines: string[] = [data.senderName, data.senderEmail, data.senderAddress, data.senderPhone].filter(Boolean);
  const toLines: string[] = [data.recipientName, data.recipientEmail, data.recipientAddress].filter(Boolean);

  fromLines.forEach((line, i) => {
    if (i === 0) doc.setFont("helvetica", "bold");
    else doc.setFont("helvetica", "normal");
    doc.text(line, margin, y + i * 6);
  });

  toLines.forEach((line, i) => {
    if (i === 0) doc.setFont("helvetica", "bold");
    else doc.setFont("helvetica", "normal");
    doc.text(line, margin + contentWidth / 2 + 5, y + i * 6);
  });

  y = Math.max(y + fromLines.length * 6, y + toLines.length * 6) + 10;

  // Table header
  doc.setFillColor(style.headerBg[0], style.headerBg[1], style.headerBg[2]);
  doc.rect(margin, y, contentWidth, 9, "F");
  doc.setTextColor(style.headerText[0], style.headerText[1], style.headerText[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  const col1 = margin + 3;
  const col2 = margin + contentWidth * 0.55;
  const col3 = margin + contentWidth * 0.7;
  const col4 = margin + contentWidth - 3;

  doc.text("Description", col1, y + 6);
  doc.text("Qty", col2, y + 6);
  doc.text("Rate", col3, y + 6);
  doc.text("Amount", col4, y + 6, { align: "right" });

  y += 13;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  let subtotal = 0;
  data.items.forEach((item) => {
    const amount = item.quantity * item.rate;
    subtotal += amount;

    // Wrap long descriptions
    const descLines = doc.splitTextToSize(item.description || "\u2014", contentWidth * 0.5);
    descLines.forEach((line: string, li: number) => {
      doc.text(line, col1, y + li * 5);
    });
    doc.text(String(item.quantity), col2, y);
    const rateStr = isCreditNote ? `-${sym}${item.rate.toFixed(2)}` : `${sym}${item.rate.toFixed(2)}`;
    const amtStr = isCreditNote ? `-${sym}${amount.toFixed(2)}` : `${sym}${amount.toFixed(2)}`;
    doc.text(rateStr, col3, y);
    doc.text(amtStr, col4, y, { align: "right" });

    y += Math.max(descLines.length * 5, 5) + 3;

    // Separator line
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y - 1, margin + contentWidth, y - 1);
  });

  // Totals
  y += 5;
  const totalsX = margin + contentWidth * 0.6;
  const totalsValX = col4;
  doc.setFontSize(10);

  const sign = isCreditNote ? "-" : "";

  doc.text("Subtotal", totalsX, y);
  doc.text(`${sign}${formatMoney(subtotal, data.currency)}`, totalsValX, y, { align: "right" });

  if (data.discountRate > 0) {
    y += 7;
    const discountAmt = subtotal * (data.discountRate / 100);
    doc.text(`Discount (${data.discountRate}%)`, totalsX, y);
    doc.setTextColor(220, 38, 38);
    doc.text(`-${formatMoney(discountAmt, data.currency)}`, totalsValX, y, { align: "right" });
    doc.setTextColor(0, 0, 0);
    subtotal -= discountAmt;
  }

  if (data.taxRate > 0) {
    y += 7;
    const taxAmt = subtotal * (data.taxRate / 100);
    doc.text(`Tax (${data.taxRate}%)`, totalsX, y);
    doc.text(`${sign}${formatMoney(taxAmt, data.currency)}`, totalsValX, y, { align: "right" });
    subtotal += taxAmt;
  }

  y += 10;
  doc.setFillColor(style.headerBg[0], style.headerBg[1], style.headerBg[2]);
  doc.rect(totalsX - 5, y - 6, contentWidth * 0.4 + 5, 10, "F");
  doc.setTextColor(style.headerText[0], style.headerText[1], style.headerText[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Total", totalsX, y);
  doc.text(`${sign}${formatMoney(subtotal, data.currency)}`, totalsValX, y, { align: "right" });

  // Notes
  if (data.notes.trim()) {
    y += 20;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("NOTES", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const noteLines = doc.splitTextToSize(data.notes, contentWidth);
    doc.text(noteLines, margin, y);
  }

  const filePrefix = data.documentType === "credit_note" ? "credit-note" : data.documentType;
  doc.save(`${filePrefix}-${data.invoiceNumber}.pdf`);
}

// --- Component ---

export default function InvoiceGeneratorContent() {
  const [invoice, setInvoice] = useState<InvoiceData>(defaultInvoice);
  const [loaded, setLoaded] = useState(false);

  // Load sender defaults on mount
  useEffect(() => {
    const defaults = loadSenderDefaults();
    const inv = defaultInvoice();
    if (Object.keys(defaults).length > 0) {
      setInvoice({ ...inv, ...defaults });
    } else {
      setInvoice(inv);
    }
    setLoaded(true);
  }, []);

  // Auto-calculate due date when payment term or invoice date changes
  useEffect(() => {
    if (invoice.paymentTerm === "custom") return;
    const termInfo = paymentTerms.find((t) => t.value === invoice.paymentTerm);
    if (!termInfo || termInfo.days === null || !invoice.invoiceDate) return;
    const newDue = addDays(invoice.invoiceDate, termInfo.days);
    if (newDue !== invoice.dueDate) {
      setInvoice((prev) => ({ ...prev, dueDate: newDue }));
    }
  }, [invoice.paymentTerm, invoice.invoiceDate, invoice.dueDate]);

  const update = useCallback(
    <K extends keyof InvoiceData>(key: K, value: InvoiceData[K]) => {
      setInvoice((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateItem = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, [field]: value } : it)),
    }));
  }, []);

  const addItem = useCallback(() => {
    setInvoice((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  }, []);

  const removeItem = useCallback((id: string) => {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((it) => it.id !== id) : prev.items,
    }));
  }, []);

  const handleDocTypeChange = useCallback((docType: DocumentType) => {
    const info = documentTypeLabels[docType];
    setInvoice((prev) => ({
      ...prev,
      documentType: docType,
      invoiceNumber: getNextNumber(info.prefix),
    }));
  }, []);

  const handleNewInvoice = useCallback(() => {
    // Increment counter for current doc type before creating new
    const info = documentTypeLabels[invoice.documentType];
    incrementCounter(info.prefix);
    const defaults = loadSenderDefaults();
    const newInv = defaultInvoice(invoice.documentType);
    setInvoice({ ...newInv, ...defaults });
  }, [invoice.documentType]);

  const isCreditNote = invoice.documentType === "credit_note";
  const subtotal = invoice.items.reduce((s, it) => s + it.quantity * it.rate, 0);
  const discountAmt = subtotal * (invoice.discountRate / 100);
  const afterDiscount = subtotal - discountAmt;
  const taxAmt = afterDiscount * (invoice.taxRate / 100);
  const total = afterDiscount + taxAmt;
  const displayTotal = isCreditNote ? -total : total;

  const handleExport = useCallback(() => {
    saveSenderDefaults(invoice);
    const info = documentTypeLabels[invoice.documentType];
    incrementCounter(info.prefix);
    generatePDF(invoice);
  }, [invoice]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => handleExport(), label: "Download" },
  ], [handleExport]));

  if (!loaded) return null;

  return (
    <div className="min-h-screen" style={{ color: "var(--kami-text)" }}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="Invoice Generator"
          tagline="Create an invoice, quote, or credit note - fill in the fields, export as a clean PDF. No signup, nothing saved to a server."
          description="Fill in your business info once (saved locally for next time), enter line items with quantities and rates, add tax and discount, pick a currency. Live preview updates as you type. Switch between invoice / quote / credit-note layouts. Export a print-ready PDF with a single click."
          audience={["Freelancers", "Small business owners", "Contractors"]}
          whenToUse={[
            "Invoicing a client without a full accounting app",
            "Sending a quote before starting work",
            "Issuing a credit note for a refund",
          ]}
        />

        {/* Document type selector */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
            Document Type
          </label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(documentTypeLabels) as DocumentType[]).map((dt) => {
              const active = invoice.documentType === dt;
              return (
                <button
                  key={dt}
                  onClick={() => handleDocTypeChange(dt)}
                  className="px-4 py-2 text-sm font-medium transition-all"
                  style={{
                    background: active ? "var(--kami-cta-bg)" : "var(--kami-cta2-bg, var(--kami-surface-solid))",
                    color: active ? "var(--kami-cta-text)" : "var(--kami-cta2-text, var(--kami-text-muted))",
                    border: active
                      ? "1px solid var(--kami-cta-bg)"
                      : "1px solid var(--kami-cta2-border, var(--kami-border-strong))",
                    borderRadius: "var(--kami-cta-radius, 0.5rem)",
                    boxShadow: active ? "var(--kami-cta-shadow, none)" : "none",
                  }}
                >
                  {documentTypeLabels[dt].label}
                </button>
              );
            })}
            <div className="flex-1" />
            <button
              onClick={handleNewInvoice}
              className="px-4 py-2 text-sm transition-colors"
              style={{
                color: "var(--kami-text-muted)",
                border: "1px dashed var(--kami-border-strong)",
                borderRadius: "var(--kami-cta-radius, 0.5rem)",
              }}
            >
              + New {documentTypeLabels[invoice.documentType].label}
            </button>
          </div>
        </div>

        {/* Template selector */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
            Template
          </label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(templateStyles) as TemplateName[]).map((t) => {
              const active = invoice.template === t;
              return (
                <button
                  key={t}
                  onClick={() => update("template", t)}
                  className="px-4 py-2 text-sm font-medium transition-all"
                  style={{
                    background: active ? "var(--kami-cta-bg)" : "var(--kami-cta2-bg, var(--kami-surface-solid))",
                    color: active ? "var(--kami-cta-text)" : "var(--kami-cta2-text, var(--kami-text-muted))",
                    border: active
                      ? "1px solid var(--kami-cta-bg)"
                      : "1px solid var(--kami-cta2-border, var(--kami-border-strong))",
                    borderRadius: "var(--kami-cta-radius, 0.5rem)",
                    boxShadow: active ? "var(--kami-cta-shadow, none)" : "none",
                  }}
                >
                  <span
                    className="mr-2 inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: templateStyles[t].accent }}
                  />
                  {templateStyles[t].label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* From */}
          <fieldset
            className="p-5"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
              boxShadow: "var(--kami-card-shadow, none)",
            }}
          >
            <legend className="px-2 text-sm font-semibold" style={{ color: "var(--kami-text-muted)" }}>
              From (Your Details)
            </legend>
            <div className="mt-2 space-y-3">
              <Input
                label="Name / Company"
                value={invoice.senderName}
                onChange={(v) => update("senderName", v)}
              />
              <Input
                label="Email"
                type="email"
                value={invoice.senderEmail}
                onChange={(v) => update("senderEmail", v)}
              />
              <Input
                label="Address"
                value={invoice.senderAddress}
                onChange={(v) => update("senderAddress", v)}
              />
              <Input
                label="Phone"
                value={invoice.senderPhone}
                onChange={(v) => update("senderPhone", v)}
              />
            </div>
          </fieldset>

          {/* To */}
          <fieldset
            className="p-5"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
              boxShadow: "var(--kami-card-shadow, none)",
            }}
          >
            <legend className="px-2 text-sm font-semibold" style={{ color: "var(--kami-text-muted)" }}>
              To (Client)
            </legend>
            <div className="mt-2 space-y-3">
              <Input
                label="Name / Company"
                value={invoice.recipientName}
                onChange={(v) => update("recipientName", v)}
              />
              <Input
                label="Email"
                type="email"
                value={invoice.recipientEmail}
                onChange={(v) => update("recipientEmail", v)}
              />
              <Input
                label="Address"
                value={invoice.recipientAddress}
                onChange={(v) => update("recipientAddress", v)}
              />
            </div>
          </fieldset>
        </div>

        {/* Invoice details */}
        <fieldset
          className="mt-6 p-5"
          style={{
            background: "var(--kami-surface-solid)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            boxShadow: "var(--kami-card-shadow, none)",
          }}
        >
          <legend className="px-2 text-sm font-semibold" style={{ color: "var(--kami-text-muted)" }}>
            {documentTypeLabels[invoice.documentType].label} Details
          </legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-5">
            <Input
              label={`${documentTypeLabels[invoice.documentType].label} #`}
              value={invoice.invoiceNumber}
              onChange={(v) => update("invoiceNumber", v)}
            />
            <Input
              label="Date"
              type="date"
              value={invoice.invoiceDate}
              onChange={(v) => update("invoiceDate", v)}
            />
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>
                Payment Terms
              </label>
              <select
                value={invoice.paymentTerm}
                onChange={(e) => update("paymentTerm", e.target.value as PaymentTerm)}
                className="w-full px-3 py-2 text-sm focus:outline-none"
                style={{
                  background: "var(--kami-input-bg, var(--kami-surface-solid))",
                  color: "var(--kami-text)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                }}
              >
                {paymentTerms.map((pt) => (
                  <option key={pt.value} value={pt.value}>
                    {pt.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Due Date"
              type="date"
              value={invoice.dueDate}
              onChange={(v) => {
                update("dueDate", v);
                update("paymentTerm", "custom");
              }}
            />
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>
                Currency
              </label>
              <select
                value={invoice.currency}
                onChange={(e) => update("currency", e.target.value)}
                className="w-full px-3 py-2 text-sm focus:outline-none"
                style={{
                  background: "var(--kami-input-bg, var(--kami-surface-solid))",
                  color: "var(--kami-text)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                }}
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        {/* Line items */}
        <fieldset
          className="mt-6 p-5"
          style={{
            background: "var(--kami-surface-solid)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            boxShadow: "var(--kami-card-shadow, none)",
          }}
        >
          <legend className="px-2 text-sm font-semibold" style={{ color: "var(--kami-text-muted)" }}>
            Line Items
          </legend>
          <div className="mt-2 space-y-3">
            {/* Header row */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_80px_100px_100px_36px] sm:gap-2 text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>
              <span>Description</span>
              <span>Qty</span>
              <span>Rate</span>
              <span>Amount</span>
              <span />
            </div>

            {invoice.items.map((item) => {
              const amount = item.quantity * item.rate;
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_80px_100px_100px_36px] items-center"
                >
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(item.id, "description", e.target.value)
                    }
                    className="px-3 py-2 text-sm focus:outline-none"
                    style={{
                      background: "var(--kami-input-bg, var(--kami-surface-solid))",
                      color: "var(--kami-text)",
                      border: "1px solid var(--kami-border-strong)",
                      borderRadius: "var(--kami-input-radius, 0.5rem)",
                    }}
                  />
                  <input
                    type="number"
                    min={0}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(
                        item.id,
                        "quantity",
                        Math.max(0, parseFloat(e.target.value) || 0)
                      )
                    }
                    className="px-3 py-2 text-sm focus:outline-none"
                    style={{
                      background: "var(--kami-input-bg, var(--kami-surface-solid))",
                      color: "var(--kami-text)",
                      border: "1px solid var(--kami-border-strong)",
                      borderRadius: "var(--kami-input-radius, 0.5rem)",
                    }}
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.rate}
                    onChange={(e) =>
                      updateItem(
                        item.id,
                        "rate",
                        Math.max(0, parseFloat(e.target.value) || 0)
                      )
                    }
                    className="px-3 py-2 text-sm focus:outline-none"
                    style={{
                      background: "var(--kami-input-bg, var(--kami-surface-solid))",
                      color: "var(--kami-text)",
                      border: "1px solid var(--kami-border-strong)",
                      borderRadius: "var(--kami-input-radius, 0.5rem)",
                    }}
                  />
                  <div className="flex items-center text-sm font-medium" style={{ color: "var(--kami-text)" }}>
                    {isCreditNote && amount > 0 ? "-" : ""}
                    {formatMoney(amount, invoice.currency)}
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="flex h-9 w-9 items-center justify-center transition-colors"
                    style={{
                      color: "var(--kami-text-dim)",
                      borderRadius: "var(--kami-cta-radius, 0.5rem)",
                    }}
                    title="Remove item"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              );
            })}

            <button
              onClick={addItem}
              className="px-4 py-2 text-sm transition-colors"
              style={{
                color: "var(--kami-text-muted)",
                border: "1px dashed var(--kami-border-strong)",
                borderRadius: "var(--kami-cta-radius, 0.5rem)",
              }}
            >
              + Add Item
            </button>
          </div>
        </fieldset>

        {/* Tax, Discount, Notes */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <fieldset
            className="p-5"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
              boxShadow: "var(--kami-card-shadow, none)",
            }}
          >
            <legend className="px-2 text-sm font-semibold" style={{ color: "var(--kami-text-muted)" }}>
              Notes
            </legend>
            <textarea
              value={invoice.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Payment terms, thank you message, etc."
              rows={4}
              className="mt-2 w-full px-3 py-2 text-sm resize-none focus:outline-none"
              style={{
                background: "var(--kami-input-bg, var(--kami-surface-solid))",
                color: "var(--kami-text)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-input-radius, 0.5rem)",
              }}
            />
          </fieldset>

          <div className="space-y-4">
            <fieldset
              className="p-5"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <legend className="px-2 text-sm font-semibold" style={{ color: "var(--kami-text-muted)" }}>
                Tax & Discount
              </legend>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Input
                  label="Tax %"
                  type="number"
                  value={String(invoice.taxRate)}
                  onChange={(v) =>
                    update("taxRate", Math.max(0, parseFloat(v) || 0))
                  }
                />
                <Input
                  label="Discount %"
                  type="number"
                  value={String(invoice.discountRate)}
                  onChange={(v) =>
                    update("discountRate", Math.max(0, parseFloat(v) || 0))
                  }
                />
              </div>
            </fieldset>

            {/* Summary */}
            <div
              className="p-5"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: "var(--kami-text-muted)" }}>Subtotal</span>
                  <span>
                    {isCreditNote && subtotal > 0 ? "-" : ""}
                    {formatMoney(subtotal, invoice.currency)}
                  </span>
                </div>
                {invoice.discountRate > 0 && (
                  <div className="flex justify-between" style={{ color: "color-mix(in srgb, #dc2626 80%, var(--kami-text))" }}>
                    <span>Discount ({invoice.discountRate}%)</span>
                    <span>
                      -{formatMoney(discountAmt, invoice.currency)}
                    </span>
                  </div>
                )}
                {invoice.taxRate > 0 && (
                  <div className="flex justify-between">
                    <span style={{ color: "var(--kami-text-muted)" }}>
                      Tax ({invoice.taxRate}%)
                    </span>
                    <span>
                      {isCreditNote && taxAmt > 0 ? "-" : ""}
                      {formatMoney(taxAmt, invoice.currency)}
                    </span>
                  </div>
                )}
                <div
                  className="flex justify-between pt-2 text-lg font-bold"
                  style={{ borderTop: "1px solid var(--kami-border)" }}
                >
                  <span>Total</span>
                  <span style={isCreditNote ? { color: "color-mix(in srgb, #dc2626 80%, var(--kami-text))" } : undefined}>
                    {displayTotal < 0 ? "-" : ""}
                    {formatMoney(total, invoice.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Export button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleExport}
            className="px-8 py-3 text-sm font-semibold transition-all active:scale-[0.98]"
            style={{
              background: "var(--kami-cta-bg)",
              color: "var(--kami-cta-text)",
              borderRadius: "var(--kami-cta-radius, 0.75rem)",
              boxShadow: "var(--kami-cta-shadow, var(--kami-card-shadow, none))",
            }}
          >
            Download PDF
          </button>
        </div>

        {/* Footer */}
      </div>
    </div>
  );
}

// --- Reusable Input ---

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm focus:outline-none"
        style={{
          background: "var(--kami-input-bg, var(--kami-surface-solid))",
          color: "var(--kami-text)",
          border: "1px solid var(--kami-border-strong)",
          borderRadius: "var(--kami-input-radius, 0.5rem)",
        }}
      />
    </div>
  );
}
