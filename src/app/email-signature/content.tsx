"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

interface SigData {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  linkedin: string;
  accentColor: string;
}

const DEFAULTS: SigData = {
  name: "",
  title: "",
  company: "",
  email: "",
  phone: "",
  website: "",
  linkedin: "",
  accentColor: "#1a1a1a",
};

// ---------------------------------------------------------------------------
// URL serialisation
// ---------------------------------------------------------------------------

function toParams(sig: SigData): string {
  const p = new URLSearchParams();
  (Object.keys(sig) as (keyof SigData)[]).forEach((k) => {
    if (sig[k]) p.set(k, sig[k]);
  });
  return p.toString();
}

function fromParams(search: string): SigData {
  const p = new URLSearchParams(search);
  const out: SigData = { ...DEFAULTS };
  (Object.keys(DEFAULTS) as (keyof SigData)[]).forEach((k) => {
    const v = p.get(k);
    if (v) out[k] = v;
  });
  return out;
}

// ---------------------------------------------------------------------------
// HTML generation
// ---------------------------------------------------------------------------

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function buildHTML(sig: SigData): string {
  const { name, title, company, email, phone, website, linkedin, accentColor } = sig;
  const init = initials(name) || "?";
  const websiteClean = website.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const contactLines: string[] = [];
  if (email) contactLines.push(`<a href="mailto:${email}" style="color:${accentColor};text-decoration:none;">${email}</a>`);
  if (phone) contactLines.push(`<span style="color:#555;">${phone}</span>`);
  if (website) contactLines.push(`<a href="${website.startsWith("http") ? website : "https://" + website}" style="color:${accentColor};text-decoration:none;">${websiteClean}</a>`);
  if (linkedin) {
    const liClean = linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, "");
    contactLines.push(`<a href="${linkedin.startsWith("http") ? linkedin : "https://linkedin.com/in/" + linkedin}" style="color:${accentColor};text-decoration:none;">linkedin/${liClean}</a>`);
  }

  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333;line-height:1.5;">
  <tr>
    <td style="padding-right:16px;border-right:2px solid ${accentColor};vertical-align:middle;">
      <div style="width:48px;height:48px;background:${accentColor};border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:700;text-align:center;line-height:48px;">
        ${init}
      </div>
    </td>
    <td style="padding-left:16px;vertical-align:middle;">
      ${name ? `<div style="font-size:16px;font-weight:700;color:#111;">${name}</div>` : ""}
      ${title || company ? `<div style="color:#555;font-size:13px;margin-top:2px;">${[title, company].filter(Boolean).join(" · ")}</div>` : ""}
      ${contactLines.length > 0 ? `<div style="margin-top:8px;font-size:12px;">${contactLines.join(" &nbsp;·&nbsp; ")}</div>` : ""}
    </td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
// Field component
// ---------------------------------------------------------------------------

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs kami-text-dim">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
        style={{
          background: "var(--kami-input-bg, var(--kami-surface))",
          border: "1px solid var(--kami-border-strong)",
          color: "var(--kami-text)",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ACCENT = "#6366f1";

export default function EmailSignatureContent() {
  const [sig, setSig] = useState<SigData>(DEFAULTS);
  const [copied, setCopied] = useState<"html" | "url" | null>(null);
  const [metroCPivot, setMetroCPivot] = useState<string>("input");


  // Load from URL on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const search = window.location.search;
    if (search) {
      const loaded = fromParams(search);
      const hasData = Object.values(loaded).some((v) => v && v !== DEFAULTS.accentColor);
      if (hasData) setSig(loaded);
    }
  }, []);

  const set = useCallback(<K extends keyof SigData>(k: K, v: SigData[K]) => {
    setSig((prev) => ({ ...prev, [k]: v }));
  }, []);

  const html = buildHTML(sig);
  const hasContent = !!(sig.name || sig.email);

  const copyHTML = useCallback(async () => {
    await navigator.clipboard.writeText(html);
    setCopied("html");
    setTimeout(() => setCopied(null), 2000);
  }, [html]);

  const copyURL = useCallback(async () => {
    const url = `${window.location.origin}${window.location.pathname}?${toParams(sig)}`;
    await navigator.clipboard.writeText(url);
    setCopied("url");
    setTimeout(() => setCopied(null), 2000);
    // Update browser URL without reload
    window.history.replaceState({}, "", `?${toParams(sig)}`);
  }, [sig]);

  const cardStyle = {
    background: "var(--kami-surface-solid)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-card-radius, 0.75rem)",
  } as const;

  return (
    <ToolShell
      title="Email Signature"
      tagline="Generate a clean signature. Share it via link."
      accent={ACCENT}
      actions={
        <>
          <ToolActionButton onClick={copyURL} disabled={!hasContent}>
            {copied === "url" ? "Copied!" : "Copy link"}
          </ToolActionButton>
          <ToolActionButton onClick={copyHTML} disabled={!hasContent}>
            {copied === "html" ? "Copied!" : "Copy HTML"}
          </ToolActionButton>
        </>
      }
      controls={
        <>
          <ControlGroup label="Identity">
            <Field label="Full name" value={sig.name} onChange={(v) => set("name", v)} placeholder="Kesava Mandiga" />
            <Field label="Title" value={sig.title} onChange={(v) => set("title", v)} placeholder="Product Marketing Lead" />
            <Field label="Company" value={sig.company} onChange={(v) => set("company", v)} placeholder="Acme Corp" />
          </ControlGroup>

          <ControlGroup label="Contact">
            <Field label="Email" type="email" value={sig.email} onChange={(v) => set("email", v)} placeholder="hello@you.com" />
            <Field label="Phone" value={sig.phone} onChange={(v) => set("phone", v)} placeholder="+1 555 000 0000" />
            <Field label="Website" value={sig.website} onChange={(v) => set("website", v)} placeholder="https://you.com" />
            <Field label="LinkedIn" value={sig.linkedin} onChange={(v) => set("linkedin", v)} placeholder="linkedin.com/in/yourname" />
          </ControlGroup>

          <ControlGroup label="Accent colour">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={sig.accentColor}
                onChange={(e) => set("accentColor", e.target.value)}
                className="w-10 h-10 rounded-lg border cursor-pointer kami-border-strong-all"
              />
              <input
                type="text"
                value={sig.accentColor}
                onChange={(e) => set("accentColor", e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-sm border"
                style={{
                  background: "var(--kami-input-bg, var(--kami-surface))",
                  border: "1px solid var(--kami-border-strong)",
                  color: "var(--kami-text)",
                }}
              />
            </div>
          </ControlGroup>
        </>
      }
    >
      <nav className="canvas-metro-pivot" role="tablist" aria-label="View">
        <button role="tab" aria-selected={metroCPivot === "input"}
          className={`metro-pivot-item${metroCPivot === "input" ? " is-active" : ""}`}
          onClick={() => setMetroCPivot("input")}>Form</button>
        <button role="tab" aria-selected={metroCPivot === "output"}
          className={`metro-pivot-item${metroCPivot === "output" ? " is-active" : ""}`}
          onClick={() => setMetroCPivot("output")}>Preview</button>
      </nav>
      <div className="flex flex-col gap-4 w-full">
        {/* Live preview */}
        <div className="canvas-section glass-canvas-section" data-panel="output"><div className="p-6" style={cardStyle}>
          <p className="text-xs uppercase tracking-widest mb-4 kami-text-dim">
            Preview
          </p>
          {hasContent ? (
            <div
              dangerouslySetInnerHTML={{ __html: html }}
              style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
            />
          ) : (
            <p className="text-sm kami-text-dim">
              Fill in your name and email to see the preview.
            </p>
          )}
        </div></div>

        {hasContent && (
        <div className="glass-canvas-section"><>
          {/* Raw HTML */}
          <div className="p-5" style={cardStyle}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest kami-text-dim">
                HTML to paste in Gmail / Outlook
              </p>
              <div
                role="button"
                tabIndex={0}
                onClick={copyHTML}
                onKeyDown={(e) => e.key === "Enter" && copyHTML()}
                className="text-xs px-3 py-1 rounded-md font-medium cursor-pointer select-none"
                style={{
                  background: copied === "html" ? "#10b981" : "var(--kami-border-strong)",
                  color: copied === "html" ? "#fff" : "var(--kami-text)",
                  transition: "background 0.2s",
                  display: "inline-block",
                }}
              >
                {copied === "html" ? "Copied!" : "Copy"}
              </div>
            </div>
            <pre
              className="text-xs overflow-x-auto rounded-lg p-3 whitespace-pre-wrap break-all"
              style={{
                background: "var(--kami-surface)",
                color: "var(--kami-text-dim)",
                maxHeight: 180,
              }}
            >
              {html}
            </pre>
          </div>

          {/* Share */}
          <div className="p-5 flex items-center justify-between gap-4" style={cardStyle}>
            <div>
              <p className="text-sm font-medium kami-text">
                Share this signature
              </p>
              <p className="text-xs mt-0.5 kami-text-dim">
                The link encodes your signature — no account or storage needed.
              </p>
            </div>
            <div
              role="button"
              tabIndex={0}
              onClick={copyURL}
              onKeyDown={(e) => e.key === "Enter" && copyURL()}
              className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer select-none"
              style={{ background: copied === "url" ? "#10b981" : ACCENT, color: "#fff", transition: "background 0.2s" }}
            >
              {copied === "url" ? "Copied!" : "Copy link"}
            </div>
          </div>
        </></div>
        )}

      </div>
    </ToolShell>
  );
}
