"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, Select, Toggle } from "@/components/tools/controls";

// --- Timezones ---

const TIMEZONES = [
  { tz: "UTC", label: "UTC" },
  { tz: "America/New_York", label: "New York (ET)" },
  { tz: "America/Chicago", label: "Chicago (CT)" },
  { tz: "America/Denver", label: "Denver (MT)" },
  { tz: "America/Los_Angeles", label: "Los Angeles (PT)" },
  { tz: "Europe/London", label: "London (GMT/BST)" },
  { tz: "Europe/Berlin", label: "Berlin (CET)" },
  { tz: "Europe/Paris", label: "Paris (CET)" },
  { tz: "Asia/Tokyo", label: "Tokyo (JST)" },
  { tz: "Asia/Shanghai", label: "Shanghai (CST)" },
  { tz: "Asia/Kolkata", label: "Kolkata (IST)" },
  { tz: "Asia/Dubai", label: "Dubai (GST)" },
  { tz: "Asia/Singapore", label: "Singapore (SGT)" },
  { tz: "Australia/Sydney", label: "Sydney (AEST)" },
  { tz: "Pacific/Auckland", label: "Auckland (NZST)" },
] as const;

// --- Relative time ---

function relativeTime(ts: number): string {
  const now = Date.now();
  const diffMs = ts - now;
  const absDiff = Math.abs(diffMs);
  const past = diffMs < 0;

  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  let label: string;
  if (seconds < 5) label = "just now";
  else if (seconds < 60) label = `${seconds}s`;
  else if (minutes < 60) label = `${minutes}m`;
  else if (hours < 24) label = `${hours}h`;
  else if (days < 7) label = `${days}d`;
  else if (weeks < 5) label = `${weeks}w`;
  else if (months < 12) label = `${months}mo`;
  else label = `${years}y`;

  if (label === "just now") return label;
  return past ? `${label} ago` : `in ${label}`;
}

// --- Format helpers ---

function formatInTimezone(date: Date, tz: string, style: "full" | "short" = "full"): string {
  try {
    if (style === "short") {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "2-digit", minute: "2-digit", hour12: false,
      }).format(date);
    }
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return "Invalid";
  }
}

function formatISO(date: Date): string { return date.toISOString(); }
function formatRFC2822(date: Date): string { return date.toUTCString().replace("GMT", "+0000"); }
function formatSQL(date: Date): string {
  return date.toISOString().replace("T", " ").replace("Z", "").split(".")[0];
}
function formatUnixS(date: Date): string { return String(Math.floor(date.getTime() / 1000)); }
function formatUnixMs(date: Date): string { return String(date.getTime()); }
function formatUnixUs(date: Date): string { return String(date.getTime() * 1000); }

// --- Date math ---

function parseDateMath(input: string, baseDate: Date): Date | null {
  const d = new Date(baseDate);
  const lower = input.trim().toLowerCase();

  if (lower === "now") return d;
  if (lower === "today") { d.setHours(0, 0, 0, 0); return d; }
  if (lower === "tomorrow") { d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); return d; }
  if (lower === "yesterday") { d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); return d; }

  if (lower === "start of day") { d.setHours(0, 0, 0, 0); return d; }
  if (lower === "end of day") { d.setHours(23, 59, 59, 999); return d; }
  if (lower === "start of week") { d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d; }
  if (lower === "end of week") { d.setDate(d.getDate() + (6 - d.getDay())); d.setHours(23, 59, 59, 999); return d; }
  if (lower === "start of month") { d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
  if (lower === "end of month") { d.setMonth(d.getMonth() + 1, 0); d.setHours(23, 59, 59, 999); return d; }
  if (lower === "start of year") { d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return d; }
  if (lower === "end of year") { d.setMonth(11, 31); d.setHours(23, 59, 59, 999); return d; }

  const mathMatch = lower.match(/^([+-])\s*(\d+)\s*(seconds?|minutes?|hours?|days?|weeks?|months?|years?)$/);
  if (mathMatch) {
    const sign = mathMatch[1] === "+" ? 1 : -1;
    const amount = parseInt(mathMatch[2]) * sign;
    const unit = mathMatch[3].replace(/s$/, "");
    switch (unit) {
      case "second": d.setSeconds(d.getSeconds() + amount); break;
      case "minute": d.setMinutes(d.getMinutes() + amount); break;
      case "hour": d.setHours(d.getHours() + amount); break;
      case "day": d.setDate(d.getDate() + amount); break;
      case "week": d.setDate(d.getDate() + amount * 7); break;
      case "month": d.setMonth(d.getMonth() + amount); break;
      case "year": d.setFullYear(d.getFullYear() + amount); break;
    }
    return d;
  }

  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const nextLastMatch = lower.match(/^(next|last)\s+(\w+)$/);
  if (nextLastMatch) {
    const dir = nextLastMatch[1] === "next" ? 1 : -1;
    const dayIdx = dayNames.indexOf(nextLastMatch[2]);
    if (dayIdx >= 0) {
      const current = d.getDay();
      let diff = dayIdx - current;
      if (dir === 1 && diff <= 0) diff += 7;
      if (dir === -1 && diff >= 0) diff -= 7;
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }

  return null;
}

// --- Quick presets ---

const PRESETS = [
  { label: "Now", math: "now" },
  { label: "Start of day", math: "start of day" },
  { label: "End of day", math: "end of day" },
  { label: "Tomorrow", math: "tomorrow" },
  { label: "Yesterday", math: "yesterday" },
  { label: "+1 hour", math: "+1 hour" },
  { label: "+1 week", math: "+1 week" },
  { label: "Start of month", math: "start of month" },
  { label: "Start of year", math: "start of year" },
];

// Common epoch presets
const EPOCH_PRESETS = [
  { label: "Unix epoch (1970)", value: 0 },
  { label: "Y2K (Jan 1 2000)", value: 946684800 },
  { label: "Jan 1 2010", value: 1262304000 },
  { label: "Jan 1 2020", value: 1577836800 },
  { label: "Jan 1 2030", value: 1893456000 },
] as const;

type Granularity = "s" | "ms" | "us";

// --- Component ---

export default function TimestampContent() {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [{ ts: tsInput }, setToolState] = useToolState({ ts: "" });
  const setTsInput = useCallback((v: string) => setToolState({ ts: v }), [setToolState]);
  const [dateInput, setDateInput] = useState("");
  const [dateMathInput, setDateMathInput] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [showMultiTz, setShowMultiTz] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [granularity, setGranularity] = useState<Granularity>("s");

  const [currentTheme, setCurrentTheme] = useState<string>("default");
  useEffect(() => {
    const readTheme = () => document.documentElement.getAttribute("data-theme") ?? "default";
    setCurrentTheme(readTheme());
    const obs = new MutationObserver(() => setCurrentTheme(readTheme()));
    obs.observe(document.documentElement, { attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  const isMaterial = currentTheme === "material";
  const isMetro    = currentTheme === "metro";
  const isGlass    = currentTheme === "glass";
  const [metroCPivot, setMetroCPivot] = useState<"input" | "output">("input");

  // Live clock
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const handleCopy = useCallback(async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const setNowInputs = useCallback(() => {
    const nowLocal = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    setDateInput(`${nowLocal.getFullYear()}-${pad(nowLocal.getMonth() + 1)}-${pad(nowLocal.getDate())}T${pad(nowLocal.getHours())}:${pad(nowLocal.getMinutes())}`);
    setTsInput(String(Math.floor(Date.now() / 1000)));
  }, [setTsInput]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => handleCopy(String(now), "now"), label: "Copy" },
    { key: "k", meta: true, action: setNowInputs, label: "Now" },
  ], [now, handleCopy, setNowInputs]));

  // Timestamp -> Date
  const parsedTs = tsInput.trim() ? Number(tsInput.trim()) : null;
  const tsValid = parsedTs !== null && !isNaN(parsedTs) && isFinite(parsedTs);
  const tsDate = tsValid ? new Date(parsedTs! < 1e12 ? parsedTs! * 1000 : parsedTs!) : null;
  const tsMs = tsDate ? tsDate.getTime() : null;

  const allFormats = tsDate ? [
    { label: "ISO 8601", value: formatISO(tsDate), key: "iso" },
    { label: "Locale (" + (timezone.split("/").pop()?.replace(/_/g, " ") ?? timezone) + ")", value: formatInTimezone(tsDate, timezone), key: "locale" },
    { label: "UTC String", value: tsDate.toUTCString(), key: "utc" },
    { label: "RFC 2822", value: formatRFC2822(tsDate), key: "rfc" },
    { label: "SQL Datetime", value: formatSQL(tsDate), key: "sql" },
    { label: "Seconds", value: formatUnixS(tsDate), key: "s" },
    { label: "Milliseconds", value: formatUnixMs(tsDate), key: "ms" },
    { label: "Microseconds", value: formatUnixUs(tsDate), key: "us" },
    { label: "Relative", value: relativeTime(tsMs!), key: "relative" },
  ] : [];

  // Date -> Timestamp
  const dateTs = dateInput ? Math.floor(new Date(dateInput).getTime() / 1000) : null;
  const dateValid = dateTs !== null && !isNaN(dateTs);

  // Date math
  const dateMathResult = useMemo(() => {
    if (!dateMathInput.trim()) return null;
    return parseDateMath(dateMathInput, new Date());
  }, [dateMathInput]);

  // Display current "now" by granularity
  const nowDisplay = useMemo(() => {
    if (granularity === "ms") return String(now * 1000);
    if (granularity === "us") return String(now * 1000 * 1000);
    return String(now);
  }, [now, granularity]);

  const cardStyle = {
    background: "var(--kami-surface-solid)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-card-radius, 0.75rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  } as const;
  const inputStyle = {
    background: "var(--kami-input-bg, var(--kami-surface-solid))",
    color: "var(--kami-text)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-input-radius, 0.5rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  } as const;
  const rowStyle = {
    border: "1px solid var(--kami-border)",
    borderRadius: "var(--kami-cta-radius, 0.5rem)",
  } as const;

  return (
    <ToolShell
      title="Timestamp Converter"
      tagline="Epoch ↔ ISO · timezone picker · date math"
      accent="#10b981"
      materialFab={{ label: "Copy", onClick: () => handleCopy(nowDisplay, "now") }}
      actions={
        <>
          <ToolActionButton onClick={() => handleCopy(nowDisplay, "now")} variant="outline">
            {copied === "now" ? "Copied" : `Copy ${granularity}`}
          </ToolActionButton>
          <ToolActionButton onClick={setNowInputs} variant="solid">Use now</ToolActionButton>
        </>
      }
      controls={
        <>
          <ControlGroup label="Timezone">
            <Select<string>
              value={timezone}
              onChange={setTimezone}
              options={TIMEZONES.map((t) => ({ value: t.tz, label: t.label }))}
            />
          </ControlGroup>
          <ControlGroup label="Granularity">
            <Segment<Granularity>
              value={granularity}
              onChange={setGranularity}
              options={[
                { value: "s", label: "Seconds" },
                { value: "ms", label: "Millis" },
                { value: "us", label: "Micros" },
              ]}
              full
            />
          </ControlGroup>
          <Toggle
            label="Live now"
            hint="Auto-refresh the current timestamp every second"
            checked={autoRefresh}
            onChange={setAutoRefresh}
          />
          <Toggle
            label="All timezones"
            hint="Show the moment across every timezone"
            checked={showMultiTz}
            onChange={setShowMultiTz}
          />
          <ControlGroup label="Common epochs">
            <div className="flex flex-wrap gap-1.5">
              {EPOCH_PRESETS.map((e) => (
                <button
                  key={e.label}
                  type="button"
                  onClick={() => setTsInput(String(e.value))}
                  className="px-2 py-1 text-xs"
                  style={{
                    background: "var(--kami-surface)",
                    color: "var(--kami-text-muted)",
                    border: "1px solid var(--kami-border)",
                    borderRadius: "var(--kami-cta-radius, 0.375rem)",
                    minHeight: 32,
                  }}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </ControlGroup>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {isMetro && (
          <nav style={{ display: "flex", borderBottom: "1px solid #d1d1d1", marginBottom: 12 }}>
            {(["input", "output"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMetroCPivot(tab)}
                style={{
                  padding: "8px 16px",
                  fontSize: 14,
                  fontWeight: metroCPivot === tab ? 600 : 400,
                  color: metroCPivot === tab ? "#0078d4" : "#605e5c",
                  background: "none",
                  border: "none",
                  borderBottom: metroCPivot === tab ? "2px solid #0078d4" : "2px solid transparent",
                  cursor: "pointer",
                  fontFamily: "'Segoe UI', system-ui, sans-serif",
                  textTransform: "capitalize",
                }}
              >
                {tab === "input" ? "Input" : "Formats"}
              </button>
            ))}
          </nav>
        )}

        {(!isMetro || metroCPivot === "input") && (
          <div className={isGlass ? "glass-canvas-section" : ""}>
            {/* Live Clock */}
            <div className="p-5" style={cardStyle}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--kami-text-dim)" }}>
                    Current Unix Timestamp {autoRefresh ? "" : "(paused)"}
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{nowDisplay}</p>
                  <p className="mt-0.5 font-mono text-xs tabular-nums" style={{ color: "var(--kami-text-dim)" }}>
                    s={now} · ms={now * 1000}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ToolActionButton onClick={() => setTsInput(String(now))} variant="ghost">Use</ToolActionButton>
                  <ToolActionButton onClick={() => handleCopy(nowDisplay, "now")} variant="solid">
                    {copied === "now" ? "Copied" : "Copy"}
                  </ToolActionButton>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-4">
              {/* Timestamp -> Date */}
              <div>
                <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--kami-text-muted)" }}>Timestamp → Date</h2>
                <div className="p-4 flex flex-col gap-3" style={cardStyle}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={tsInput}
                    onChange={(e) => setTsInput(e.target.value)}
                    placeholder="e.g. 1700000000"
                    className="w-full px-3 py-2 text-sm font-mono focus:outline-none"
                    style={{ ...inputStyle, minHeight: 40 }}
                  />

                  {tsInput.trim() && !tsValid && (
                    <p className="text-sm" style={{ color: "var(--kami-accent, #ef4444)" }}>
                      Invalid timestamp. Enter seconds, milliseconds, or microseconds.
                    </p>
                  )}

                  {allFormats.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {allFormats.map(({ label, value, key }) => (
                        <div key={key} className="flex items-center justify-between px-3 py-2" style={rowStyle}>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs" style={{ color: "var(--kami-text-dim)" }}>{label}</p>
                            <p className="font-mono text-sm truncate">{value}</p>
                          </div>
                          <ToolActionButton onClick={() => handleCopy(value, key)} variant="ghost">
                            {copied === key ? "✓" : "Copy"}
                          </ToolActionButton>
                        </div>
                      ))}
                    </div>
                  )}

                  {tsDate && showMultiTz && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {TIMEZONES.map((tz) => (
                        <div
                          key={tz.tz}
                          className="flex items-center justify-between px-2.5 py-1.5"
                          style={{
                            background: "var(--kami-surface)",
                            borderRadius: "var(--kami-cta-radius, 0.375rem)",
                          }}
                        >
                          <span className="text-xs truncate" style={{ color: "var(--kami-text-muted)" }}>{tz.label}</span>
                          <span className="font-mono text-xs" style={{ color: "var(--kami-text)" }}>
                            {formatInTimezone(tsDate, tz.tz, "short")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Date -> Timestamp */}
              <div>
                <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--kami-text-muted)" }}>Date → Timestamp</h2>
                <div className="p-4 flex flex-col gap-3" style={cardStyle}>
                  <div className="flex flex-col md:flex-row gap-2">
                    <input
                      type="datetime-local"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm focus:outline-none"
                      style={{ ...inputStyle, minHeight: 40 }}
                    />
                    <ToolActionButton onClick={setNowInputs} variant="outline">Now</ToolActionButton>
                  </div>

                  {dateValid && (
                    <div className="flex flex-col gap-1.5">
                      {[
                        { label: "Seconds", value: String(dateTs), key: "date-s" },
                        { label: "Milliseconds", value: String(dateTs! * 1000), key: "date-ms" },
                        { label: "ISO 8601", value: new Date(dateTs! * 1000).toISOString(), key: "date-iso" },
                        { label: "Relative", value: relativeTime(dateTs! * 1000), key: "date-rel" },
                      ].map(({ label, value, key }) => (
                        <div key={key} className="flex items-center justify-between px-3 py-2" style={rowStyle}>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs" style={{ color: "var(--kami-text-dim)" }}>{label}</p>
                            <p className="font-mono text-sm">{value}</p>
                          </div>
                          <ToolActionButton onClick={() => handleCopy(value, key)} variant="ghost">
                            {copied === key ? "✓" : "Copy"}
                          </ToolActionButton>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {(!isMetro || metroCPivot === "output") && (
          <div className={isGlass ? "glass-canvas-section" : ""}>
            {/* Date Math */}
            <div>
              <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--kami-text-muted)" }}>Date math</h2>
              <div className="p-4 flex flex-col gap-3" style={cardStyle}>
                <input
                  type="text"
                  value={dateMathInput}
                  onChange={(e) => setDateMathInput(e.target.value)}
                  placeholder="Try: +3 days, -2 hours, next monday, start of month, tomorrow..."
                  className="w-full px-3 py-2 text-sm font-mono focus:outline-none"
                  style={{ ...inputStyle, minHeight: 40 }}
                />
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setDateMathInput(p.math)}
                      className="px-2 py-1 text-xs"
                      style={{
                        background: "var(--kami-surface)",
                        color: "var(--kami-text-muted)",
                        border: "1px solid var(--kami-border)",
                        borderRadius: "var(--kami-cta-radius, 0.375rem)",
                        minHeight: 32,
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {dateMathResult && (
                  <div className="flex flex-col gap-1.5">
                    {[
                      { label: "Result", value: dateMathResult.toISOString(), key: "math-iso" },
                      { label: "Unix (seconds)", value: formatUnixS(dateMathResult), key: "math-s" },
                      { label: "SQL", value: formatSQL(dateMathResult), key: "math-sql" },
                      { label: "Relative", value: relativeTime(dateMathResult.getTime()), key: "math-rel" },
                      { label: "Locale", value: formatInTimezone(dateMathResult, timezone), key: "math-locale" },
                    ].map(({ label, value, key }) => (
                      <div key={key} className="flex items-center justify-between px-3 py-2" style={rowStyle}>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs" style={{ color: "var(--kami-text-dim)" }}>{label}</p>
                          <p className="font-mono text-sm">{value}</p>
                        </div>
                        <ToolActionButton onClick={() => handleCopy(value, key)} variant="ghost">
                          {copied === key ? "✓" : "Copy"}
                        </ToolActionButton>
                      </div>
                    ))}
                  </div>
                )}
                {dateMathInput.trim() && !dateMathResult && (
                  <p className="text-xs" style={{ color: "var(--kami-text-dim)" }}>
                    Examples: &quot;+3 days&quot;, &quot;-2 hours&quot;, &quot;next friday&quot;, &quot;start of month&quot;, &quot;end of year&quot;
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
