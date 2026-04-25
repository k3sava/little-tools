"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";
import { ReferencePanel, RuleRow } from "@/components/tools/reference-panel";

// --- Types ---

interface CronFields {
  second: string;
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

interface Preset {
  label: string;
  cron: string;
  sixField?: boolean;
}

// --- Constants ---

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const PRESETS: Preset[] = [
  { label: "Every minute", cron: "* * * * *" },
  { label: "Every hour", cron: "0 * * * *" },
  { label: "Every day at midnight", cron: "0 0 * * *" },
  { label: "Every Monday at 9 AM", cron: "0 9 * * 1" },
  { label: "1st of every month", cron: "0 0 1 * *" },
  { label: "Weekdays at 8 AM", cron: "0 8 * * 1-5" },
];

// --- Cron parsing & generation ---

function parseField(field: string, min: number, max: number): Set<number> {
  const values = new Set<number>();
  if (!field || field.trim() === "") return values;

  for (const part of field.split(",")) {
    const trimmed = part.trim();
    if (trimmed === "*") {
      for (let i = min; i <= max; i++) values.add(i);
    } else if (trimmed.includes("/")) {
      const [range, stepStr] = trimmed.split("/");
      const step = parseInt(stepStr, 10);
      if (isNaN(step) || step <= 0) continue;
      let start = min;
      let end = max;
      if (range && range !== "*") {
        if (range.includes("-")) {
          const [a, b] = range.split("-").map(Number);
          if (!isNaN(a)) start = a;
          if (!isNaN(b)) end = b;
        } else {
          const n = parseInt(range, 10);
          if (!isNaN(n)) start = n;
        }
      }
      for (let i = start; i <= end; i += step) values.add(i);
    } else if (trimmed.includes("-")) {
      const [a, b] = trimmed.split("-").map(Number);
      if (!isNaN(a) && !isNaN(b)) {
        for (let i = Math.max(a, min); i <= Math.min(b, max); i++)
          values.add(i);
      }
    } else {
      const n = parseInt(trimmed, 10);
      if (!isNaN(n) && n >= min && n <= max) values.add(n);
    }
  }
  return values;
}


function parseCronString(
  expr: string,
  useSixField: boolean
): CronFields | null {
  const parts = expr.trim().split(/\s+/);
  if (useSixField) {
    if (parts.length !== 6) return null;
    return {
      second: parts[0],
      minute: parts[1],
      hour: parts[2],
      dayOfMonth: parts[3],
      month: parts[4],
      dayOfWeek: parts[5],
    };
  } else {
    if (parts.length !== 5) return null;
    return {
      second: "0",
      minute: parts[0],
      hour: parts[1],
      dayOfMonth: parts[2],
      month: parts[3],
      dayOfWeek: parts[4],
    };
  }
}

function fieldsToCronString(
  fields: CronFields,
  useSixField: boolean
): string {
  if (useSixField) {
    return `${fields.second} ${fields.minute} ${fields.hour} ${fields.dayOfMonth} ${fields.month} ${fields.dayOfWeek}`;
  }
  return `${fields.minute} ${fields.hour} ${fields.dayOfMonth} ${fields.month} ${fields.dayOfWeek}`;
}

// --- Next execution times ---

function getNextExecutions(
  fields: CronFields,
  count: number,
  from?: Date
): Date[] {
  const results: Date[] = [];
  const seconds = parseField(fields.second, 0, 59);
  const minutes = parseField(fields.minute, 0, 59);
  const hours = parseField(fields.hour, 0, 23);
  const daysOfMonth = parseField(fields.dayOfMonth, 1, 31);
  const months = parseField(fields.month, 1, 12);
  const daysOfWeek = parseField(fields.dayOfWeek, 0, 6);

  if (
    seconds.size === 0 ||
    minutes.size === 0 ||
    hours.size === 0 ||
    daysOfMonth.size === 0 ||
    months.size === 0 ||
    daysOfWeek.size === 0
  ) {
    return results;
  }

  const start = from ? new Date(from) : new Date();
  // Start from the next second
  start.setSeconds(start.getSeconds() + 1);
  start.setMilliseconds(0);

  const current = new Date(start);
  const maxIterations = 500000;
  let iterations = 0;

  while (results.length < count && iterations < maxIterations) {
    iterations++;

    if (!months.has(current.getMonth() + 1)) {
      // Skip to next month
      current.setMonth(current.getMonth() + 1, 1);
      current.setHours(0, 0, 0, 0);
      continue;
    }

    if (
      !daysOfMonth.has(current.getDate()) ||
      !daysOfWeek.has(current.getDay())
    ) {
      // Skip to next day
      current.setDate(current.getDate() + 1);
      current.setHours(0, 0, 0, 0);
      continue;
    }

    if (!hours.has(current.getHours())) {
      // Skip to next hour
      current.setHours(current.getHours() + 1, 0, 0, 0);
      continue;
    }

    if (!minutes.has(current.getMinutes())) {
      // Skip to next minute
      current.setMinutes(current.getMinutes() + 1, 0, 0);
      continue;
    }

    if (!seconds.has(current.getSeconds())) {
      current.setSeconds(current.getSeconds() + 1);
      continue;
    }

    results.push(new Date(current));
    // Move to next second to find next match
    current.setSeconds(current.getSeconds() + 1);
  }

  return results;
}

// --- Human-readable description ---

function describeField(
  field: string,
  names: string[] | null,
  unit: string
): string {
  if (field === "*") return `every ${unit}`;
  if (field.startsWith("*/")) {
    const step = field.slice(2);
    return `every ${step} ${unit}${parseInt(step) > 1 ? "s" : ""}`;
  }
  if (field.includes("-")) {
    const [a, b] = field.split("-");
    const aName = names ? names[parseInt(a)] || a : a;
    const bName = names ? names[parseInt(b)] || b : b;
    return `${aName} through ${bName}`;
  }
  if (field.includes(",")) {
    const parts = field.split(",").map((p) => {
      const n = parseInt(p.trim());
      return names ? names[n] || p.trim() : p.trim();
    });
    return parts.join(", ");
  }
  const n = parseInt(field);
  if (names && !isNaN(n) && names[n]) return names[n];
  return field;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function describeCron(fields: CronFields, useSixField: boolean): string {
  const { second, minute, hour, dayOfMonth, month, dayOfWeek } = fields;

  const parts: string[] = [];

  // Time description
  const isEveryMinute = minute === "*";
  const isEveryHour = hour === "*";
  const isSingleMinute = /^\d+$/.test(minute);
  const isSingleHour = /^\d+$/.test(hour);

  if (isSingleHour && isSingleMinute) {
    const h = parseInt(hour);
    const m = parseInt(minute);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    if (m === 0) {
      parts.push(`at ${h12}:00 ${ampm}`);
    } else {
      parts.push(`at ${h12}:${pad2(m)} ${ampm}`);
    }
  } else if (isEveryMinute && isEveryHour) {
    parts.push("every minute");
  } else if (isEveryMinute && isSingleHour) {
    parts.push(
      `every minute during hour ${hour}`
    );
  } else if (isSingleMinute && isEveryHour) {
    parts.push(`at minute ${minute} of every hour`);
  } else {
    if (!isEveryMinute) {
      parts.push(`minute: ${describeField(minute, null, "minute")}`);
    }
    if (!isEveryHour) {
      parts.push(`hour: ${describeField(hour, null, "hour")}`);
    }
  }

  // Day of week
  if (dayOfWeek !== "*") {
    parts.push(`on ${describeField(dayOfWeek, DAY_NAMES, "day")}`);
  }

  // Day of month
  if (dayOfMonth !== "*") {
    parts.push(`on day ${describeField(dayOfMonth, null, "day")} of the month`);
  }

  // Month
  if (month !== "*") {
    parts.push(`in ${describeField(month, ["", ...MONTH_NAMES], "month")}`);
  }

  // Seconds (6-field)
  if (useSixField && second !== "0" && second !== "*") {
    parts.unshift(`second: ${describeField(second, null, "second")}`);
  } else if (useSixField && second === "*") {
    parts.unshift("every second");
  }

  if (parts.length === 0) return "Every minute of every day";

  // Capitalize first letter
  const result = parts.join(", ");
  return result.charAt(0).toUpperCase() + result.slice(1);
}

// --- Validate cron expression ---

function isValidCron(expr: string, useSixField: boolean): boolean {
  const parts = expr.trim().split(/\s+/);
  const expectedParts = useSixField ? 6 : 5;
  if (parts.length !== expectedParts) return false;

  const fieldPattern = /^(\*|\d+(-\d+)?(,\d+(-\d+)?)*)(\/((\d+)(-\d+)?))?$/;
  const wildcardStep = /^\*\/\d+$/;

  return parts.every(
    (p) => fieldPattern.test(p) || wildcardStep.test(p) || p === "*"
  );
}

// --- Inline SVG Icons ---

function CopyIcon() {
  return (
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
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// --- Field selector component ---

function FieldSelector({
  label,
  value,
  min,
  max,
  names,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  names?: string[];
  onChange: (val: string) => void;
}) {
  const options: { value: string; label: string }[] = [
    { value: "*", label: `Every ${label.toLowerCase()}` },
  ];

  // Add common step options
  const range = max - min + 1;
  const steps = [2, 3, 5, 10, 15, 20, 30].filter((s) => s < range);
  for (const s of steps) {
    options.push({ value: `*/${s}`, label: `Every ${s} ${label.toLowerCase()}s` });
  }

  // Add individual values
  for (let i = min; i <= max; i++) {
    const display = names ? `${i} (${names[i - min]})` : i.toString();
    options.push({ value: i.toString(), label: display });
  }

  // Check if current value is in options
  const isCustom =
    value !== "*" &&
    !options.some((o) => o.value === value) &&
    !value.match(/^\d+$/) &&
    !value.match(/^\*\/\d+$/);
  const selectValue = isCustom ? "__custom__" : value;

  // If value is a number in range but the select recognizes it, fine
  // If it's a complex expression, show it in a custom option
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </label>
      <select
        value={selectValue}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {isCustom && (
          <option value="__custom__">Custom: {value}</option>
        )}
      </select>
    </div>
  );
}

// --- Main component ---

export default function CronBuilderContent() {
  const [{ cron: initialCron }, setToolState] = useToolState({ cron: "* * * * *" });
  const [useSixField, setUseSixField] = useState(initialCron.trim().split(/\s+/).length === 6);
  const initialFields = useMemo(() => {
    const sixField = initialCron.trim().split(/\s+/).length === 6;
    return parseCronString(initialCron, sixField) ?? {
      second: "0",
      minute: "*",
      hour: "*",
      dayOfMonth: "*",
      month: "*",
      dayOfWeek: "*",
    };
  }, []);
  const [fields, setFields] = useState<CronFields>(initialFields);
  const [manualInput, setManualInputRaw] = useState(initialCron);
  const setManualInput = useCallback((v: string) => {
    setManualInputRaw(v);
    setToolState({ cron: v });
  }, [setToolState]);
  const [copied, setCopied] = useState(false);
  const [isManualEdit, setIsManualEdit] = useState(false);

  // Sync fields -> manual input (when dropdown changes)
  useEffect(() => {
    if (!isManualEdit) {
      const cron = fieldsToCronString(fields, useSixField);
      setManualInputRaw(cron);
      setToolState({ cron });
    }
  }, [fields, useSixField, isManualEdit, setToolState]);

  const updateField = useCallback(
    (key: keyof CronFields, value: string) => {
      setIsManualEdit(false);
      setFields((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleManualChange = useCallback(
    (expr: string) => {
      setManualInput(expr);
      setIsManualEdit(true);
      const parsed = parseCronString(expr, useSixField);
      if (parsed) {
        setFields(parsed);
      }
    },
    [useSixField, setManualInput]
  );

  const handleToggleSixField = useCallback(() => {
    setUseSixField((prev) => {
      const next = !prev;
      setIsManualEdit(false);
      if (next) {
        // Switching to 6-field: prepend second
        setManualInput(`0 ${manualInput}`);
      } else {
        // Switching to 5-field: remove second field
        const parts = manualInput.trim().split(/\s+/);
        if (parts.length === 6) {
          setManualInput(parts.slice(1).join(" "));
        }
        setFields((prev) => ({ ...prev, second: "0" }));
      }
      return next;
    });
  }, [manualInput, setManualInput]);

  const applyPreset = useCallback(
    (preset: Preset) => {
      setIsManualEdit(false);
      const expr = preset.cron;
      const sixField = preset.sixField || false;
      if (sixField !== useSixField) {
        setUseSixField(sixField);
      }
      const parsed = parseCronString(expr, sixField);
      if (parsed) {
        setFields(parsed);
        setManualInput(expr);
      }
    },
    [useSixField]
  );

  const cronString = fieldsToCronString(fields, useSixField);
  const description = describeCron(fields, useSixField);
  const valid = isValidCron(manualInput, useSixField);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const nextTimes = useMemo(() => {
    if (!mounted) return []; // Skip on server to avoid hydration mismatch
    try {
      return getNextExecutions(fields, 10);
    } catch {
      return [];
    }
  }, [fields, mounted]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(cronString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [cronString]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => handleCopy(), label: "Copy" },
  ], [handleCopy]));

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="Cron Expression Builder"
          tagline="Build or decode cron expressions visually - with plain-English translation and the next five run times."
          description="Pick a preset (every 5 min, nightly, weekdays…) or tweak each field directly. We translate the expression into plain English, show the next 5 scheduled run times, and validate syntax as you type. Supports both 5-field (standard Unix cron) and 6-field (Quartz / Spring with seconds)."
          audience={["Developers", "DevOps", "Data engineers"]}
          whenToUse={[
            "Scheduling a cron job or GitHub Action",
            "Decoding a legacy crontab nobody remembers writing",
            "Picking the right expression for a Kubernetes CronJob",
          ]}
          quickLinks={[
            { label: "Cron field reference", href: "#cron-fields" },
            { label: "Special syntax (@hourly, */5, etc.)", href: "#cron-special" },
          ]}
        />

        {/* Presets */}
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-gray-500 uppercase tracking-wide">
            Common Presets
          </h2>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:border-gray-300 hover:text-gray-900"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Manual input + copy */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Cron Expression
            </h2>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={useSixField}
                onChange={handleToggleSixField}
                className="rounded border-gray-300"
              />
              6-field (with seconds)
            </label>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => handleManualChange(e.target.value)}
              placeholder={useSixField ? "* * * * * *" : "* * * * *"}
              className={`flex-1 rounded-lg border bg-white px-3 py-2 font-mono text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200 ${
                manualInput.trim() && !valid
                  ? "border-red-300 focus:border-red-300"
                  : "border-gray-200 focus:border-gray-300"
              }`}
            />
            <button
              onClick={handleCopy}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 flex items-center gap-1.5"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          {manualInput.trim() && !valid && (
            <p className="mt-2 text-xs text-red-500">
              Invalid cron expression. Expected{" "}
              {useSixField ? "6" : "5"} space-separated fields.
            </p>
          )}
          <p className="mt-2 text-xs text-gray-400 font-mono">
            {useSixField
              ? "second  minute  hour  day(month)  month  day(week)"
              : "minute  hour  day(month)  month  day(week)"}
          </p>
        </div>

        {/* Visual builder */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-medium text-gray-500 uppercase tracking-wide">
            Visual Builder
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {useSixField && (
              <FieldSelector
                label="Second"
                value={fields.second}
                min={0}
                max={59}
                onChange={(v) => updateField("second", v)}
              />
            )}
            <FieldSelector
              label="Minute"
              value={fields.minute}
              min={0}
              max={59}
              onChange={(v) => updateField("minute", v)}
            />
            <FieldSelector
              label="Hour"
              value={fields.hour}
              min={0}
              max={23}
              onChange={(v) => updateField("hour", v)}
            />
            <FieldSelector
              label="Day of Month"
              value={fields.dayOfMonth}
              min={1}
              max={31}
              onChange={(v) => updateField("dayOfMonth", v)}
            />
            <FieldSelector
              label="Month"
              value={fields.month}
              min={1}
              max={12}
              names={MONTH_NAMES}
              onChange={(v) => updateField("month", v)}
            />
            <FieldSelector
              label="Day of Week"
              value={fields.dayOfWeek}
              min={0}
              max={6}
              names={DAY_NAMES}
              onChange={(v) => updateField("dayOfWeek", v)}
            />
          </div>
        </div>

        {/* Description */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-medium text-gray-500 uppercase tracking-wide">
            Description
          </h2>
          <p className="text-base text-gray-900">{description}</p>
        </div>

        {/* Next execution times */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-gray-500 uppercase tracking-wide">
            Next Execution Times
          </h2>
          {nextTimes.length > 0 ? (
            <ol className="space-y-1.5">
              {nextTimes.map((d, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 text-sm"
                >
                  <span className="text-xs text-gray-400 w-5 text-right">
                    {i + 1}.
                  </span>
                  <span className="font-mono text-gray-700">
                    {d.toLocaleString(undefined, {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-gray-400">
              No upcoming execution times found.
            </p>
          )}
        </div>

        <ReferencePanel
          id="cron-fields"
          title="The 5 (or 6) fields of a cron expression"
          summary="Left to right: minute, hour, day-of-month, month, day-of-week - plus seconds in Quartz."
          defaultOpen
        >
          <div className="space-y-1">
            <RuleRow rule="Minute" explanation="0-59" example="0 = top of hour" />
            <RuleRow rule="Hour" explanation="0-23 (24-hour clock)" example="14 = 2 PM" />
            <RuleRow rule="Day of month (DOM)" explanation="1-31" example="15 = the 15th" />
            <RuleRow rule="Month" explanation="1-12 (or JAN-DEC)" example="6 = June" />
            <RuleRow rule="Day of week (DOW)" explanation="0-6, where 0 = Sunday (or SUN-SAT)" example="1 = Monday" />
            <RuleRow rule="Seconds (Quartz only)" explanation="0-59 - goes at the very start" example="30 = 30s past minute" />
          </div>
          <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
            <strong>Classic gotcha:</strong> if both day-of-month and day-of-week are set
            (both non-&quot;*&quot;), most cron daemons run the job on EITHER match - not both.
            Cloud schedulers sometimes differ; check your runtime&apos;s docs.
          </div>
        </ReferencePanel>

        <ReferencePanel
          id="cron-special"
          title="Special syntax - *, /, -, and shortcuts"
          summary="The metacharacters you'll see everywhere."
          defaultOpen={false}
        >
          <div className="space-y-1">
            <RuleRow rule="*" explanation="Every value. In minute = every minute." example="* = always" />
            <RuleRow rule="*/N" explanation="Every N units from 0." example="*/15 = 0, 15, 30, 45" />
            <RuleRow rule="A-B" explanation="A range (inclusive)." example="9-17 = 9am-5pm" />
            <RuleRow rule="A,B,C" explanation="A list of specific values." example="1,15 = 1st and 15th" />
            <RuleRow rule="A/B" explanation="Starting at A, every B." example="5/10 = 5, 15, 25…" />
            <RuleRow rule="@hourly" explanation="Shortcut for 0 * * * *" example="top of every hour" />
            <RuleRow rule="@daily / @midnight" explanation="0 0 * * *" example="midnight daily" />
            <RuleRow rule="@weekly" explanation="0 0 * * 0" example="midnight Sunday" />
            <RuleRow rule="@monthly" explanation="0 0 1 * *" example="midnight 1st of month" />
            <RuleRow rule="@yearly" explanation="0 0 1 1 *" example="midnight Jan 1" />
          </div>
        </ReferencePanel>
      </div>
    </div>
  );
}
