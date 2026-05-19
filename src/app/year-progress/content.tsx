"use client";

import { useState, useEffect, useMemo } from "react";
import { ToolShell } from "@/components/tools/tool-shell";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDayOfYear(d: Date): number {
  return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000) + 1;
}

function getDaysInYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}

function getMonthProgress(d: Date): number {
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return (d.getDate() - 1 + getDayProgress(d)) / daysInMonth;
}

function getDayProgress(d: Date): number {
  return (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400;
}

function getWeekProgress(d: Date): number {
  // 0=Sun … 6=Sat, treat week as Mon–Sun
  const dayOfWeek = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  const dayFrac = getDayProgress(d);
  return (dayOfWeek + dayFrac) / 7;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const MONTH_COMMENTS: Record<number, string> = {
  0:  "January's still forgiving. Resolutions technically intact.",
  1:  "February. The shortest month, doing the most damage to plans.",
  2:  "March. The year has woken up. Have you?",
  3:  "April showers, delayed Q1 work, and tax anxiety. Classic.",
  4:  "May. Spring is doing its thing. Q2 goals: still alive, barely.",
  5:  "Halfway through June. The year is watching you.",
  6:  "July. Summer is not a strategy, but here we are.",
  7:  "August. The year's momentum is real. Either ride it or watch it.",
  8:  "September. The air changed. So should your plans.",
  9:  "October. Q4 panic is a personality now.",
  10: "November. You have six weeks. Use them or forgive yourself.",
  11: "December. Time to decide what this year was about.",
};

function getWittyClose(pct: number): string {
  if (pct < 0.10) return "The year is still forgiving. For now.";
  if (pct < 0.25) return "Q1 goals: technically still alive.";
  if (pct < 0.40) return "The year has quietly formed opinions about your Q1.";
  if (pct < 0.50) return "Almost halfway. The year has opinions.";
  if (pct < 0.60) return "More year behind you than ahead. Make it count.";
  if (pct < 0.75) return "The year is starting to look at its watch.";
  if (pct < 0.90) return "Time to start lying about your resolutions.";
  return "Almost. You can still do something memorable this week.";
}

// ---------------------------------------------------------------------------
// Progress bar sub-component
// ---------------------------------------------------------------------------

function ProgressBar({
  label,
  pct,
  accent,
  large,
}: {
  label: string;
  pct: number;
  accent: string;
  large?: boolean;
}) {
  const display = `${(pct * 100).toFixed(large ? 2 : 1)}%`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span
          className="text-xs uppercase tracking-widest"
          style={{ color: "var(--kami-text-dim)" }}
        >
          {label}
        </span>
        <span
          className={large ? "text-5xl font-bold tabular-nums" : "text-xl font-semibold tabular-nums"}
          style={{ color: "var(--kami-text)", lineHeight: 1 }}
        >
          {display}
        </span>
      </div>
      <div
        style={{
          height: large ? 8 : 4,
          background: "var(--kami-border-strong)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct * 100}%`,
            background: accent,
            borderRadius: 999,
            transition: "width 1s linear",
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ACCENT_YEAR  = "#f43f5e";
const ACCENT_MONTH = "#a855f7";
const ACCENT_WEEK  = "#f97316";
const ACCENT_DAY   = "#facc15";

export default function YearProgressContent() {
  const [currentTheme, setCurrentTheme] = useState<string>("default");
  useEffect(() => {
    const readTheme = () => document.documentElement.getAttribute("data-theme") ?? "default";
    setCurrentTheme(readTheme());
    const obs = new MutationObserver(() => setCurrentTheme(readTheme()));
    obs.observe(document.documentElement, { attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  const isGlass = currentTheme === "glass";

  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const s = useMemo(() => {
    if (!now) return null;
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInYear = getDaysInYear(year) ? 366 : 365;
    const dayOfYear = getDayOfYear(now);
    const daysLeft = daysInYear - dayOfYear;
    const yearPct = dayOfYear / daysInYear;
    const weekPct = getWeekProgress(now);
    const monthPct = getMonthProgress(now);
    const dayPct  = getDayProgress(now);
    const week = getWeekNumber(now);
    const quarter = Math.ceil((month + 1) / 3);

    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysLeftInMonth = daysInCurrentMonth - now.getDate();
    const monthPctOfRemaining = daysLeft > 0
      ? ((daysLeftInMonth / daysLeft) * 100).toFixed(1)
      : "0.0";

    return {
      year,
      yearPct,
      weekPct,
      monthPct,
      dayPct,
      dayOfYear,
      daysInYear,
      daysLeft,
      week,
      quarter,
      month,
      monthName: MONTHS[month],
      monthPctOfRemaining,
      witty: getWittyClose(yearPct),
      monthComment: MONTH_COMMENTS[month],
    };
  }, [now]);

  const cardStyle = {
    background: "var(--kami-surface-solid)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-card-radius, 0.75rem)",
  } as const;

  return (
    <ToolShell
      title="Year Progress"
      tagline="How far through the year are you, with opinions."
      accent={ACCENT_YEAR}
      hideControls
    >
      {s && (
        <div className={isGlass ? "glass-canvas-section" : ""}>
        <div className="flex flex-col gap-4 max-w-xl mx-auto w-full">
          {/* Three bars */}
          <div className="p-6 flex flex-col gap-6" style={cardStyle}>
            <ProgressBar label={`${s.year}`} pct={s.yearPct} accent={ACCENT_YEAR} large />
            <ProgressBar label={s.monthName} pct={s.monthPct} accent={ACCENT_MONTH} />
            <ProgressBar label={`Week ${s.week}`} pct={s.weekPct} accent={ACCENT_WEEK} />
            <ProgressBar label="Today" pct={s.dayPct} accent={ACCENT_DAY} />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Day", value: `${s.dayOfYear} / ${s.daysInYear}` },
              { label: "Week", value: `${s.week} / 52` },
              { label: "Month", value: `${s.month + 1} / 12` },
              { label: "Q", value: `${s.quarter} / 4` },
            ].map(({ label, value }) => (
              <div key={label} className="p-4 text-center" style={cardStyle}>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--kami-text-dim)" }}>
                  {label}
                </p>
                <p className="text-sm font-semibold tabular-nums" style={{ color: "var(--kami-text)" }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Commentary */}
          <div className="p-5 flex flex-col gap-2.5" style={cardStyle}>
            <p className="text-sm" style={{ color: "var(--kami-text-dim)" }}>
              {s.daysLeft} days left in {s.year}.
            </p>
            <p className="text-sm" style={{ color: "var(--kami-text-dim)" }}>
              {s.monthName} accounts for {s.monthPctOfRemaining}% of what remains.
            </p>
            <p className="text-sm" style={{ color: "var(--kami-text-dim)" }}>
              {s.monthComment}
            </p>
            <p
              className="text-sm italic pt-1 border-t"
              style={{ color: "var(--kami-text-muted)", borderColor: "var(--kami-border-strong)" }}
            >
              {s.witty}
            </p>
          </div>
        </div>
        </div>
      )}
    </ToolShell>
  );
}
