"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ToolShell,
  ControlGroup,
} from "@/components/tools/tool-shell";

// --- Helpers ---

function formatBigNumber(n: number): string {
  if (n >= 1_000_000_000) return `~${(n / 1_000_000_000).toFixed(1)} billion`;
  if (n >= 1_000_000) return `~${(n / 1_000_000).toFixed(1)} million`;
  return n.toLocaleString("en-US");
}

function getDefaultDob(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 30);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getDaysUntilNextBirthday(dob: Date, today: Date): number | "today" {
  const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const thisYear = todayNorm.getFullYear();
  const thisYearBday = new Date(thisYear, dob.getMonth(), dob.getDate());
  if (thisYearBday.getTime() === todayNorm.getTime()) return "today";
  let next = thisYearBday;
  if (next < todayNorm) next = new Date(thisYear + 1, dob.getMonth(), dob.getDate());
  return Math.ceil((next.getTime() - todayNorm.getTime()) / (1000 * 60 * 60 * 24));
}

function getClosingLine(years: number): string {
  if (years < 18) return "Just getting started. Most of the story is still blank.";
  if (years < 25) return "You've barely started. The interesting part begins now.";
  if (years < 30) return "Still early. These years compound.";
  if (years < 40) return "The interesting part is just beginning.";
  if (years < 50) return "Deep enough in to know what matters. Early enough to act on it.";
  if (years < 60) return "You've earned your opinions.";
  if (years < 70) return "More experience than most people will ever have. Use it.";
  return "Rare. Most stories don't make it this far.";
}

interface StatCard {
  number: string;
  label: string;
  note?: string;
}

// --- Component ---

export default function RealAgeContent() {
  const [dob, setDob] = useState(getDefaultDob);
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setToday(new Date());
  }, []);

  const stats = useMemo((): StatCard[] | null => {
    if (!dob || !today) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    if (birth > today) return null;

    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays = Math.floor((today.getTime() - birth.getTime()) / msPerDay);
    const fullYears = Math.floor(totalDays / 365.25);
    const hoursSlept = totalDays * 8;
    const yearsAsleep = (hoursSlept / (24 * 365.25)).toFixed(1);
    const heartbeats = totalDays * 24 * 60 * 70;
    const fullMoons = Math.floor(totalDays / 29.53);
    const weekends = Math.floor((totalDays / 7) * 2);
    const daysToNext = getDaysUntilNextBirthday(birth, today);

    return [
      {
        number: String(fullYears),
        label: "Summers lived",
        note: "full trips around the sun",
      },
      {
        number: totalDays.toLocaleString("en-US"),
        label: "Days on Earth",
        note: "exact count",
      },
      {
        number: totalDays.toLocaleString("en-US"),
        label: "Sunrises witnessed",
        note: "give or take a few deep sleeps",
      },
      {
        number: `~${hoursSlept.toLocaleString("en-US")} hrs`,
        label: "Hours slept",
        note: `~${yearsAsleep} years unconscious`,
      },
      {
        number: formatBigNumber(heartbeats),
        label: "Heartbeats",
        note: "at ~70 bpm",
      },
      {
        number: fullMoons.toLocaleString("en-US"),
        label: "Full moons",
        note: "one every 29.5 days",
      },
      {
        number: weekends.toLocaleString("en-US"),
        label: "Weekends lived",
        note: "Saturdays + Sundays",
      },
      {
        number: daysToNext === "today" ? "🎉 Today" : `${daysToNext}`,
        label: "Days until next birthday",
        note: daysToNext === "today" ? "happy birthday!" : daysToNext === 1 ? "tomorrow!" : "mark your calendar",
      },
    ];
  }, [dob, today]);

  const closingLine = useMemo(() => {
    if (!dob || !today) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const totalDays = Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    const fullYears = Math.floor(totalDays / 365.25);
    return getClosingLine(fullYears);
  }, [dob, today]);

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

  return (
    <ToolShell
      title="Life in Numbers"
      tagline="Your age in units that actually mean something."
      accent="#f43f5e"
      controls={
        <ControlGroup label="Date of birth">
          <input
            type="date"
            value={dob}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDob(e.target.value)}
            className="w-full px-3 py-2 text-sm focus:outline-none"
            style={{ ...inputStyle, minHeight: 40 }}
          />
        </ControlGroup>
      }
    >
      <div className="flex flex-col gap-4">
        {!stats && (
          <div className="p-6 text-center" style={cardStyle}>
            <p className="text-sm" style={{ color: "var(--kami-text-dim)" }}>
              Enter your date of birth to see your life in numbers.
            </p>
          </div>
        )}

        {stats && (
          <>
            {/* Stat grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stats.map((card) => (
                <div key={card.label} className="p-5 flex flex-col gap-1" style={cardStyle}>
                  <p
                    className="font-bold tabular-nums leading-tight"
                    style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", color: "var(--kami-text)" }}
                  >
                    {card.number}
                  </p>
                  <p className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
                    {card.label}
                  </p>
                  {card.note && (
                    <p className="text-xs" style={{ color: "var(--kami-text-dim)" }}>
                      {card.note}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Closing line */}
            {closingLine && (
              <div className="p-4 text-center" style={cardStyle}>
                <p className="text-sm italic" style={{ color: "var(--kami-text-muted)" }}>
                  {closingLine}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </ToolShell>
  );
}
