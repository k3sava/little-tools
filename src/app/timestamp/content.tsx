"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

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

// --- Date math ---

function parseDateMath(input: string, baseDate: Date): Date | null {
  const d = new Date(baseDate);
  const lower = input.trim().toLowerCase();

  // "now" shortcuts
  if (lower === "now") return d;
  if (lower === "today") { d.setHours(0, 0, 0, 0); return d; }
  if (lower === "tomorrow") { d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); return d; }
  if (lower === "yesterday") { d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); return d; }

  // "start/end of" shortcuts
  if (lower === "start of day") { d.setHours(0, 0, 0, 0); return d; }
  if (lower === "end of day") { d.setHours(23, 59, 59, 999); return d; }
  if (lower === "start of week") { d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d; }
  if (lower === "end of week") { d.setDate(d.getDate() + (6 - d.getDay())); d.setHours(23, 59, 59, 999); return d; }
  if (lower === "start of month") { d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
  if (lower === "end of month") { d.setMonth(d.getMonth() + 1, 0); d.setHours(23, 59, 59, 999); return d; }
  if (lower === "start of year") { d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return d; }
  if (lower === "end of year") { d.setMonth(11, 31); d.setHours(23, 59, 59, 999); return d; }

  // "+3 days", "-2 hours", "+1 week" etc.
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

  // "next Monday", "last Friday"
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

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

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
    { label: "Locale (" + timezone.split("/").pop()?.replace(/_/g, " ") + ")", value: formatInTimezone(tsDate, timezone), key: "locale" },
    { label: "UTC String", value: tsDate.toUTCString(), key: "utc" },
    { label: "RFC 2822", value: formatRFC2822(tsDate), key: "rfc" },
    { label: "SQL Datetime", value: formatSQL(tsDate), key: "sql" },
    { label: "Seconds", value: formatUnixS(tsDate), key: "s" },
    { label: "Milliseconds", value: formatUnixMs(tsDate), key: "ms" },
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

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Timestamp Converter
          </h1>
          <p className="mt-2 text-gray-500">
            Convert timestamps, calculate dates, compare timezones. No ads, no tracking.
          </p>
        </div>

        {/* Live Clock */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Current Unix Timestamp
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{now}</p>
              <p className="mt-0.5 font-mono text-xs text-gray-400 tabular-nums">{now * 1000} ms</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTsInput(String(now))}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
              >
                Use
              </button>
              <button
                onClick={() => handleCopy(String(now), "now")}
                className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              >
                {copied === "now" ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* Timestamp -> Date */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">Timestamp &rarr; Date</h2>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={tsInput}
                  onChange={(e) => setTsInput(e.target.value)}
                  placeholder="e.g. 1700000000"
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-mono shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.tz} value={tz.tz}>{tz.label}</option>
                  ))}
                </select>
              </div>

              {tsInput.trim() && !tsValid && (
                <p className="mt-3 text-sm text-red-500">
                  Invalid timestamp. Enter seconds or milliseconds.
                </p>
              )}

              {allFormats.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  {allFormats.map(({ label, value, key }) => (
                    <div key={key} className="group flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="font-mono text-sm truncate">{value}</p>
                      </div>
                      <button
                        onClick={() => handleCopy(value, key)}
                        className="ml-2 flex-shrink-0 rounded-md p-1 text-gray-300 transition-colors hover:text-gray-600 group-hover:text-gray-400"
                        title="Copy"
                      >
                        {copied === key ? <CheckIcon /> : <CopyIcon />}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Multi-TZ comparison */}
              {tsDate && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowMultiTz(!showMultiTz)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    {showMultiTz ? "Hide" : "Show"} all timezones
                  </button>
                  {showMultiTz && (
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      {TIMEZONES.map((tz) => (
                        <div key={tz.tz} className="flex items-center justify-between rounded-md bg-gray-50 px-2.5 py-1.5">
                          <span className="text-xs text-gray-500 truncate">{tz.label}</span>
                          <span className="font-mono text-xs text-gray-700">{formatInTimezone(tsDate, tz.tz, "short")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Date -> Timestamp */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">Date &rarr; Timestamp</h2>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
                <button
                  onClick={setNowInputs}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
                >
                  Now
                </button>
              </div>

              {dateValid && (
                <div className="mt-4 space-y-1.5">
                  {[
                    { label: "Seconds", value: String(dateTs), key: "date-s" },
                    { label: "Milliseconds", value: String(dateTs! * 1000), key: "date-ms" },
                    { label: "ISO 8601", value: new Date(dateTs! * 1000).toISOString(), key: "date-iso" },
                    { label: "Relative", value: relativeTime(dateTs! * 1000), key: "date-rel" },
                  ].map(({ label, value, key }) => (
                    <div key={key} className="group flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="font-mono text-sm">{value}</p>
                      </div>
                      <button
                        onClick={() => handleCopy(value, key)}
                        className="ml-2 flex-shrink-0 rounded-md p-1 text-gray-300 transition-colors hover:text-gray-600 group-hover:text-gray-400"
                      >
                        {copied === key ? <CheckIcon /> : <CopyIcon />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Date Math */}
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Date Math</h2>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <input
              type="text"
              value={dateMathInput}
              onChange={(e) => setDateMathInput(e.target.value)}
              placeholder="Try: +3 days, -2 hours, next monday, start of month, tomorrow..."
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setDateMathInput(p.math)}
                  className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {dateMathResult && (
              <div className="mt-4 space-y-1.5">
                {[
                  { label: "Result", value: dateMathResult.toISOString(), key: "math-iso" },
                  { label: "Unix (seconds)", value: formatUnixS(dateMathResult), key: "math-s" },
                  { label: "SQL", value: formatSQL(dateMathResult), key: "math-sql" },
                  { label: "Relative", value: relativeTime(dateMathResult.getTime()), key: "math-rel" },
                  { label: "Locale", value: formatInTimezone(dateMathResult, timezone), key: "math-locale" },
                ].map(({ label, value, key }) => (
                  <div key={key} className="group flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="font-mono text-sm">{value}</p>
                    </div>
                    <button
                      onClick={() => handleCopy(value, key)}
                      className="ml-2 flex-shrink-0 rounded-md p-1 text-gray-300 transition-colors hover:text-gray-600 group-hover:text-gray-400"
                    >
                      {copied === key ? <CheckIcon /> : <CopyIcon />}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {dateMathInput.trim() && !dateMathResult && (
              <p className="mt-3 text-xs text-gray-400">
                Examples: &quot;+3 days&quot;, &quot;-2 hours&quot;, &quot;next friday&quot;, &quot;start of month&quot;, &quot;end of year&quot;
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
      </div>
    </div>
  );
}

// Inline SVG icons

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
