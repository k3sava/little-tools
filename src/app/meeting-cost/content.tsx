"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";

// --- Constants ---

const SALARY_OPTIONS = [
  { label: "$50,000", value: 50000 },
  { label: "$75,000", value: 75000 },
  { label: "$100,000", value: 100000 },
  { label: "$125,000", value: 125000 },
  { label: "$150,000", value: 150000 },
  { label: "$200,000", value: 200000 },
];

const HOURS_PER_YEAR = 2080;
const MINUTES_PER_HOUR = 60;

// Cost per minute: (attendees * salary) / (hours_per_year * 60)
function costPerMinute(attendees: number, salary: number): number {
  return (attendees * salary) / (HOURS_PER_YEAR * MINUTES_PER_HOUR);
}

function formatDollars(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(2)}k`;
  }
  return `$${amount.toFixed(2)}`;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// --- Equivalences ---

interface Equivalence {
  label: (cost: number) => string;
}

const EQUIVALENCES: Equivalence[] = [
  {
    label: (cost) => {
      const cups = cost / 5;
      return cups < 1
        ? `That's ${(cups * 100).toFixed(0)}% of a decent cup of coffee`
        : `That's ${cups.toFixed(1)} cups of good coffee`;
    },
  },
  {
    label: (cost) => {
      // % of weekly salary at $100k
      const weeklyAt100k = 100000 / 52;
      const pct = (cost / weeklyAt100k) * 100;
      return `That's ${pct.toFixed(1)}% of someone's weekly salary (at $100k/yr)`;
    },
  },
  {
    label: (cost) => {
      // Rotating punchy equivalences
      const options = [
        { threshold: 5, text: `That's a Spotify Premium month` },
        { threshold: 10, text: `That's an Uber across town` },
        { threshold: 25, text: `That's a decent dinner for two` },
        { threshold: 50, text: `That's a flight upgrade` },
        { threshold: 100, text: `That's a flight from NYC to Boston` },
        { threshold: 300, text: `That's a one-way flight to Miami` },
        { threshold: 500, text: `That's a weekend hotel stay` },
        { threshold: 1000, text: `That's a transatlantic flight` },
        { threshold: Infinity, text: `That's someone's rent` },
      ];
      const match = options.find((o) => cost < o.threshold);
      return match ? match.text : `That's a lot`;
    },
  },
];

// --- Component ---

export default function MeetingCostContent() {
  const [attendees, setAttendees] = useState(6);
  const [salary, setSalary] = useState(100000);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const startTimeRef = useRef<number | null>(null);
  const baseElapsedRef = useRef(0); // seconds accumulated before latest start
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>("default");
  const [metroCPivot, setMetroCPivot] = useState<"input" | "output">("input");

  const cpm = costPerMinute(attendees, salary);
  const totalCost = cpm * (elapsed / 60);

  const start = useCallback(() => {
    if (running) return;
    startTimeRef.current = Date.now();
    setRunning(true);
  }, [running]);

  const stop = useCallback(() => {
    if (!running) return;
    if (startTimeRef.current !== null) {
      baseElapsedRef.current += Math.floor((Date.now() - startTimeRef.current) / 1000);
    }
    startTimeRef.current = null;
    setRunning(false);
  }, [running]);

  const reset = useCallback(() => {
    stop();
    baseElapsedRef.current = 0;
    startTimeRef.current = null;
    setElapsed(0);
    setRunning(false);
  }, [stop]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current !== null) {
          const sinceStart = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setElapsed(baseElapsedRef.current + sinceStart);
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

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

  void isMaterial;

  const has30MinWarning = elapsed >= 30 * 60;
  const hasEmailVerdict = elapsed >= 45 * 60;

  const cardStyle = {
    background: "var(--kami-surface-solid)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-card-radius, 0.75rem)",
  } as const;

  const inputStyle = {
    background: "var(--kami-input-bg, var(--kami-surface-solid))",
    color: "var(--kami-text)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-input-radius, 0.5rem)",
  } as const;

  return (
    <ToolShell
      title="Meeting Cost Meter"
      tagline="The live cost of this meeting, in real time."
      accent="#ef4444"
      actions={
        <>
          {!running ? (
            <ToolActionButton onClick={start} variant="solid">
              Start Meeting
            </ToolActionButton>
          ) : (
            <ToolActionButton onClick={stop} variant="outline">
              Pause
            </ToolActionButton>
          )}
          <ToolActionButton onClick={reset} variant="ghost">
            Reset
          </ToolActionButton>
        </>
      }
      controls={
        <>
          <ControlGroup label="Attendees">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold tabular-nums">{attendees}</span>
                <span className="text-xs" style={{ color: "var(--kami-text-dim)" }}>people</span>
              </div>
              <input
                type="range"
                min={2}
                max={20}
                step={1}
                value={attendees}
                onChange={(e) => setAttendees(Number(e.target.value))}
                className="w-full"
                style={{ accentColor: "#ef4444" }}
              />
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: "var(--kami-text-dim)" }}>2</span>
                <span className="text-xs" style={{ color: "var(--kami-text-dim)" }}>20</span>
              </div>
            </div>
          </ControlGroup>

          <ControlGroup label="Average annual salary">
            <select
              value={salary}
              onChange={(e) => setSalary(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm focus:outline-none"
              style={{ ...inputStyle, minHeight: 36 }}
            >
              {SALARY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </ControlGroup>

          <div className="p-3" style={{ ...cardStyle, border: "1px solid var(--kami-border)" }}>
            <p className="text-xs" style={{ color: "var(--kami-text-dim)" }}>Cost per minute</p>
            <p className="text-lg font-bold tabular-nums mt-0.5">
              {formatDollars(cpm)}
              <span className="text-sm font-normal ml-1" style={{ color: "var(--kami-text-dim)" }}>/min</span>
            </p>
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-4 w-full">
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
                {tab === "input" ? "Setup" : "Cost"}
              </button>
            ))}
          </nav>
        )}

        {/* Main cost display */}
        <div className={isGlass ? "glass-canvas-section" : ""}>
        {(!isMetro || metroCPivot === "output") && (
        <div className="flex flex-col gap-4">
        <div className="p-6 flex flex-col items-center justify-center min-h-48" style={cardStyle}>
          {!running && elapsed === 0 ? (
            <>
              {/* Pre-start state */}
              <p className="text-5xl font-bold tabular-nums" style={{ color: "#ef4444" }}>
                {formatDollars(cpm)}
                <span className="text-2xl font-normal ml-1" style={{ color: "var(--kami-text-dim)" }}>/min</span>
              </p>
              <p className="mt-2 text-sm" style={{ color: "var(--kami-text-dim)" }}>
                {attendees} people · ${salary.toLocaleString("en-US")}/yr avg
              </p>
            </>
          ) : (
            <>
              {/* Running / paused state */}
              <p
                className="font-bold tabular-nums"
                style={{
                  fontSize: "clamp(3rem, 10vw, 5rem)",
                  lineHeight: 1,
                  color: running ? "#ef4444" : "var(--kami-text)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatDollars(totalCost)}
              </p>
              <p className="mt-2 text-xl font-mono tabular-nums" style={{ color: "var(--kami-text-dim)" }}>
                {formatElapsed(elapsed)}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--kami-text-dim)" }}>
                {running ? "and counting..." : "paused"}
              </p>
            </>
          )}
        </div>

        {/* Equivalences — only shown once meeting has started */}
        {elapsed > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {EQUIVALENCES.map((eq, i) => (
              <div key={i} className="p-4" style={cardStyle}>
                <p className="text-sm" style={{ color: "var(--kami-text-muted)" }}>
                  {eq.label(totalCost)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* 30-minute warning */}
        {has30MinWarning && !hasEmailVerdict && (
          <div
            className="p-4"
            style={{
              ...cardStyle,
              borderLeft: "3px solid #ef4444",
            }}
          >
            <p className="text-sm" style={{ color: "var(--kami-text-muted)" }}>
              This meeting has been going for 30 minutes. Just saying.
            </p>
          </div>
        )}

        {/* 45-minute verdict */}
        {hasEmailVerdict && (
          <div
            className="p-4"
            style={{
              ...cardStyle,
              borderLeft: "3px solid #ef4444",
            }}
          >
            <p className="text-sm font-medium" style={{ color: "#ef4444" }}>
              This could have been an email.
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--kami-text-dim)" }}>
              45 minutes × {attendees} people = {attendees * 45} person-minutes. Someone write the summary.
            </p>
          </div>
        )}

        {/* Formula note */}
        <div className="p-3" style={{ ...cardStyle, border: "1px solid var(--kami-border)" }}>
          <p className="text-xs" style={{ color: "var(--kami-text-dim)" }}>
            Formula: (attendees × salary ÷ 2,080 hrs ÷ 60 min) × minutes elapsed
            · Current rate: {formatDollars(cpm)}/min · {attendees} people · ${salary.toLocaleString("en-US")}/yr avg salary
          </p>
        </div>
        </div>
        )}
        </div>

        {(!isMetro || metroCPivot === "input") && (
        <div className={isGlass ? "glass-canvas-section" : ""}>
          <div className="p-4" style={cardStyle}>
            <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--kami-text-dim)" }}>
              Meeting setup
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: "var(--kami-text-muted)" }}>Attendees</span>
                <span className="text-sm font-semibold tabular-nums">{attendees} people</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: "var(--kami-text-muted)" }}>Avg salary</span>
                <span className="text-sm font-semibold tabular-nums">${salary.toLocaleString("en-US")}/yr</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: "var(--kami-text-muted)" }}>Cost per minute</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: "#ef4444" }}>{formatDollars(cpm)}/min</span>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </ToolShell>
  );
}
