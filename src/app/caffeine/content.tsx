"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";

// --- Types ---

interface DrinkEntry {
  id: number;
  time: string; // "HH:MM" local time
  drinkType: string;
}

interface DrinkOption {
  label: string;
  mg: number;
}

// --- Constants ---

const DRINK_OPTIONS: DrinkOption[] = [
  { label: "Espresso shot", mg: 64 },
  { label: "Drip coffee", mg: 96 },
  { label: "Americano", mg: 128 },
  { label: "Latte", mg: 64 },
  { label: "Cold brew", mg: 200 },
  { label: "Energy drink", mg: 160 },
  { label: "Green tea", mg: 30 },
];

const HALF_LIFE_HOURS = 5;
const CLEARED_THRESHOLD_PCT = 5;
const SLEEP_SAFE_MG = 50; // mg at bedtime considered safe for sleep

let nextId = 1;
function makeId() { return nextId++; }

function defaultDrinks(): DrinkEntry[] {
  return [{ id: makeId(), time: "08:00", drinkType: "Drip coffee" }];
}

function defaultBedtime(): string {
  return "23:00";
}

// --- Caffeine math ---

function remainingMg(initialMg: number, elapsedHours: number): number {
  return initialMg * Math.pow(0.5, elapsedHours / HALF_LIFE_HOURS);
}

function nowDecimalHours(now: Date): number {
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
}

function totalRemainingAtTime(drinks: DrinkEntry[], targetHours: number): number {
  return drinks.reduce((sum, d) => {
    const option = DRINK_OPTIONS.find((o) => o.label === d.drinkType);
    if (!option) return sum;
    const [dh, dm] = d.time.split(":").map(Number);
    const drinkDecH = dh + dm / 60;
    let elapsed = targetHours - drinkDecH;
    if (elapsed < 0) elapsed += 24;
    if (elapsed > 48) return sum;
    return sum + remainingMg(option.mg, elapsed);
  }, 0);
}

function caffeineAtBedtime(drinks: DrinkEntry[], bedtimeDecH: number): number {
  return totalRemainingAtTime(drinks, bedtimeDecH);
}

function sleepTrafficLight(mgAtBedtime: number): "green" | "yellow" | "red" {
  if (mgAtBedtime <= SLEEP_SAFE_MG) return "green";
  if (mgAtBedtime <= 100) return "yellow";
  return "red";
}

// Returns the latest time (decimal hours) you could have a drip coffee and still stay sleep-safe
function lastSafeCoffeeTime(drinks: DrinkEntry[], bedtimeDecH: number): number | null {
  const existingMg = caffeineAtBedtime(drinks, bedtimeDecH);
  const extraAllowed = SLEEP_SAFE_MG - existingMg;
  const addedMg = 96; // drip coffee reference
  if (extraAllowed <= 0) return null; // already over limit
  // 96 × 0.5^(elapsed/5) ≤ extraAllowed → elapsed ≥ 5 × log2(96/extraAllowed)
  const elapsedNeeded = HALF_LIFE_HOURS * Math.log2(addedMg / extraAllowed);
  if (elapsedNeeded <= 0) return bedtimeDecH; // any time is fine
  const lastSafe = bedtimeDecH - elapsedNeeded;
  return lastSafe < 0 ? lastSafe + 24 : lastSafe;
}

function formatTime(decimalHours: number): string {
  const totalMinutes = Math.round(decimalHours * 60) % (24 * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

function bedtimeDecimalHours(bedtime: string): number {
  const [h, m] = bedtime.split(":").map(Number);
  return h + m / 60;
}

// Find when total caffeine drops below cleared threshold
function findClearedTime(drinks: DrinkEntry[]): number | null {
  if (drinks.length === 0) return null;
  let latest = 0;
  for (const d of drinks) {
    const [dh, dm] = d.time.split(":").map(Number);
    const dec = dh + dm / 60;
    if (dec > latest) latest = dec;
  }
  const totalInitial = drinks.reduce((sum, d) => {
    const opt = DRINK_OPTIONS.find((o) => o.label === d.drinkType);
    return sum + (opt?.mg ?? 0);
  }, 0);
  for (let h = latest; h <= latest + 36; h += 5 / 60) {
    const remaining = totalRemainingAtTime(drinks, h);
    const pct = (remaining / totalInitial) * 100;
    if (pct < CLEARED_THRESHOLD_PCT) return h;
  }
  return null;
}

// Personality lines — name each drink with its mg
function personalityLine(drinks: DrinkEntry[], pctNow: number, mgAtBedtime: number, now: Date): string {
  if (drinks.length === 0) return "No caffeine tracked. Either very disciplined or very tired.";
  if (pctNow < 5) return "Clear. Sleep is yours whenever you want it.";
  if (pctNow < 15) return "Almost through it. Give it another hour.";

  const nowH = nowDecimalHours(now);
  const recents = [...drinks].sort((a, b) => {
    const [ah, am] = a.time.split(":").map(Number);
    const [bh, bm] = b.time.split(":").map(Number);
    return (bh + bm / 60) - (ah + am / 60);
  });
  const latest = recents[0];
  const [lh, lm] = latest.time.split(":").map(Number);
  const drinkDecH = lh + lm / 60;
  const opt = DRINK_OPTIONS.find((o) => o.label === latest.drinkType);
  const elapsed = nowH < drinkDecH ? nowH - drinkDecH + 24 : nowH - drinkDecH;
  const pctLatest = opt ? (remainingMg(opt.mg, elapsed) / opt.mg) * 100 : 0;

  if (drinks.length >= 3) {
    const totalMg = drinks.reduce((s, d) => s + (DRINK_OPTIONS.find(o => o.label === d.drinkType)?.mg ?? 0), 0);
    return `${totalMg}mg total. Your nervous system is having a conversation it didn't ask for.`;
  }
  if (nowH >= 20 && mgAtBedtime > 50) return `Your ${latest.drinkType.toLowerCase()} (${opt?.mg ?? 0}mg) will still be ${Math.round(mgAtBedtime)}mg active at bedtime. This is why nights are long.`;
  if (pctNow > 60) return `Peak caffeine territory. ${opt?.mg ?? 0}mg of ${latest.drinkType.toLowerCase()} doing its job well.`;
  if (elapsed < 2) return `Fresh ${latest.drinkType.toLowerCase()} (${opt?.mg ?? 0}mg). Just getting started.`;
  return `Your ${latest.drinkType.toLowerCase()} (${opt?.mg ?? 0}mg) is ${Math.round(pctLatest)}% active. The half-life is inexorable.`;
}

// --- Chart rendering ---

const CHART_HOURS = 24;
const CHART_POINTS = 288;

function buildCurvePoints(drinks: DrinkEntry[]): number[] {
  if (drinks.length === 0) return Array(CHART_POINTS).fill(0);
  const totalInitial = drinks.reduce((sum, d) => {
    const opt = DRINK_OPTIONS.find((o) => o.label === d.drinkType);
    return sum + (opt?.mg ?? 0);
  }, 0);
  if (totalInitial === 0) return Array(CHART_POINTS).fill(0);
  return Array.from({ length: CHART_POINTS }, (_, i) => {
    const h = (i / CHART_POINTS) * CHART_HOURS;
    const mg = totalRemainingAtTime(drinks, h);
    return Math.min(100, (mg / totalInitial) * 100);
  });
}

// Traffic light config
const TRAFFIC_CONFIG = {
  green:  { color: "#10b981", label: "Sleep is safe",       note: "under 50mg at bedtime" },
  yellow: { color: "#f59e0b", label: "Sleep may suffer",    note: "50–100mg at bedtime" },
  red:    { color: "#ef4444", label: "Sleep compromised",   note: "over 100mg at bedtime" },
};

// --- Component ---

export default function CaffeineContent() {
  const [drinks, setDrinks] = useState<DrinkEntry[]>(defaultDrinks);
  const [bedtime, setBedtime] = useState<string>(defaultBedtime);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(id);
  }, []);

  const addDrink = useCallback(() => {
    if (drinks.length >= 3) return;
    const defaults = ["08:00", "12:00", "15:00"];
    const time = defaults[drinks.length] ?? "12:00";
    setDrinks((prev) => [...prev, { id: makeId(), time, drinkType: "Drip coffee" }]);
  }, [drinks.length]);

  const removeDrink = useCallback((id: number) => {
    setDrinks((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const updateDrink = useCallback((id: number, field: "time" | "drinkType", value: string) => {
    setDrinks((prev) => prev.map((d) => d.id === id ? { ...d, [field]: value } : d));
  }, []);

  const nowH = nowDecimalHours(now);
  const curvePoints = useMemo(() => buildCurvePoints(drinks), [drinks]);

  const nowPct = useMemo(() => {
    if (drinks.length === 0) return 0;
    const totalInitial = drinks.reduce((sum, d) => {
      const opt = DRINK_OPTIONS.find((o) => o.label === d.drinkType);
      return sum + (opt?.mg ?? 0);
    }, 0);
    if (totalInitial === 0) return 0;
    return Math.min(100, (totalRemainingAtTime(drinks, nowH) / totalInitial) * 100);
  }, [drinks, nowH]);

  const bedtimeH = useMemo(() => bedtimeDecimalHours(bedtime), [bedtime]);
  const mgAtBedtime = useMemo(() => caffeineAtBedtime(drinks, bedtimeH), [drinks, bedtimeH]);
  const trafficLight = useMemo(() => sleepTrafficLight(mgAtBedtime), [mgAtBedtime]);
  const lastSafeCoffee = useMemo(() => lastSafeCoffeeTime(drinks, bedtimeH), [drinks, bedtimeH]);
  const clearedTime = useMemo(() => findClearedTime(drinks), [drinks]);
  const personality = useMemo(() => personalityLine(drinks, nowPct, mgAtBedtime, now), [drinks, nowPct, mgAtBedtime, now]);

  const nowX = (nowH / CHART_HOURS) * 100;
  const bedtimeX = (bedtimeH / CHART_HOURS) * 100;

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

  const svgWidth = 600;
  const svgHeight = 120;

  const pathD = useMemo(() => {
    return curvePoints.map((pct, i) => {
      const x = (i / (CHART_POINTS - 1)) * svgWidth;
      const y = svgHeight - (pct / 100) * svgHeight * 0.9 - svgHeight * 0.05;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
  }, [curvePoints]);

  const areaD = useMemo(() => `${pathD} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`, [pathD]);

  const tc = TRAFFIC_CONFIG[trafficLight];

  return (
    <ToolShell
      title="Caffeine Clock"
      tagline="When will your coffee actually wear off?"
      accent="#f59e0b"
      controls={
        <>
          <ControlGroup label="Your drinks today">
            <div className="flex flex-col gap-3">
              {drinks.map((drink, idx) => (
                <div key={drink.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>
                      Drink {idx + 1}
                    </span>
                    {drinks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDrink(drink.id)}
                        className="text-xs px-1.5 py-0.5"
                        style={{
                          color: "var(--kami-text-dim)",
                          border: "1px solid var(--kami-border)",
                          borderRadius: "0.375rem",
                          background: "transparent",
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="time"
                    value={drink.time}
                    onChange={(e) => updateDrink(drink.id, "time", e.target.value)}
                    className="w-full px-3 py-2 text-sm focus:outline-none"
                    style={{ ...inputStyle, minHeight: 36 }}
                  />
                  <select
                    value={drink.drinkType}
                    onChange={(e) => updateDrink(drink.id, "drinkType", e.target.value)}
                    className="w-full px-3 py-2 text-sm focus:outline-none"
                    style={{ ...inputStyle, minHeight: 36 }}
                  >
                    {DRINK_OPTIONS.map((opt) => (
                      <option key={opt.label} value={opt.label}>
                        {opt.label} ({opt.mg}mg)
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </ControlGroup>

          {drinks.length < 3 ? (
            <ToolActionButton onClick={addDrink} variant="outline">
              + Add drink
            </ToolActionButton>
          ) : (
            <p className="text-xs" style={{ color: "var(--kami-text-dim)" }}>
              3 drinks tracked. Respect the limit.
            </p>
          )}

          <ControlGroup label="Bedtime">
            <input
              type="time"
              value={bedtime}
              onChange={(e) => setBedtime(e.target.value)}
              className="w-full px-3 py-2 text-sm focus:outline-none"
              style={{ ...inputStyle, minHeight: 36 }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--kami-text-dim)" }}>
              Used to assess sleep impact.
            </p>
          </ControlGroup>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Chart */}
        <div className="p-4" style={cardStyle}>
          <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: "var(--kami-text-dim)" }}>
            Caffeine in system — today
          </p>
          <div className="relative w-full overflow-hidden" style={{ borderRadius: "0.5rem" }}>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full"
              style={{ display: "block", height: 140 }}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="caffeineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.04" />
                </linearGradient>
              </defs>
              <path d={areaD} fill="url(#caffeineGrad)" />
              <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {/* Bedtime marker */}
              <line
                x1={`${(bedtimeX / 100) * svgWidth}`} y1="0"
                x2={`${(bedtimeX / 100) * svgWidth}`} y2={svgHeight}
                stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 3"
              />
              {/* Now marker */}
              <line
                x1={`${(nowX / 100) * svgWidth}`} y1="0"
                x2={`${(nowX / 100) * svgWidth}`} y2={svgHeight}
                stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3"
              />
            </svg>
            <div className="flex justify-between mt-1 px-0.5">
              {["12am", "3am", "6am", "9am", "12pm", "3pm", "6pm", "9pm", "12am"].map((label) => (
                <span key={label} className="text-xs tabular-nums" style={{ color: "var(--kami-text-dim)", fontSize: "10px" }}>
                  {label}
                </span>
              ))}
            </div>
            {/* Chart legend */}
            <div className="flex gap-4 mt-2">
              <span className="text-xs flex items-center gap-1.5" style={{ color: "var(--kami-text-dim)" }}>
                <span style={{ display: "inline-block", width: 16, height: 2, borderTop: "1.5px dashed #ef4444", verticalAlign: "middle" }} /> Now
              </span>
              <span className="text-xs flex items-center gap-1.5" style={{ color: "var(--kami-text-dim)" }}>
                <span style={{ display: "inline-block", width: 16, height: 2, borderTop: "1.5px dashed #8b5cf6", verticalAlign: "middle" }} /> Bedtime
              </span>
            </div>
          </div>

          {drinks.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {drinks.map((d) => {
                const opt = DRINK_OPTIONS.find((o) => o.label === d.drinkType);
                return (
                  <span key={d.id} className="text-xs px-2 py-1" style={{
                    background: "var(--kami-surface)",
                    border: "1px solid var(--kami-border)",
                    borderRadius: "0.375rem",
                    color: "var(--kami-text-muted)",
                  }}>
                    ☕ {d.time} · {d.drinkType} ({opt?.mg ?? 0}mg)
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats — 3 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Right now */}
          <div className="p-4" style={cardStyle}>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--kami-text-dim)" }}>
              Right now
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums" style={{ color: "#f59e0b" }}>
              {Math.round(nowPct)}%
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--kami-text-dim)" }}>
              active caffeine
            </p>
          </div>

          {/* Sleep impact — traffic light */}
          <div className="p-4" style={cardStyle}>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--kami-text-dim)" }}>
              At bedtime
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <span style={{
                display: "inline-block",
                width: 12, height: 12,
                borderRadius: "50%",
                background: tc.color,
                flexShrink: 0,
              }} />
              <p className="text-base font-semibold leading-snug" style={{ color: tc.color }}>
                {tc.label}
              </p>
            </div>
            <p className="mt-0.5 text-xs" style={{ color: "var(--kami-text-dim)" }}>
              {Math.round(mgAtBedtime)}mg active · {tc.note}
            </p>
          </div>

          {/* Last safe coffee */}
          <div className="p-4" style={cardStyle}>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--kami-text-dim)" }}>
              Last safe coffee
            </p>
            {lastSafeCoffee !== null ? (
              <>
                <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: "var(--kami-text)" }}>
                  {formatTime(lastSafeCoffee)}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--kami-text-dim)" }}>
                  {nowH < lastSafeCoffee ? "still time — have one if you need" : "that ship has sailed"}
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-base font-semibold" style={{ color: "#ef4444" }}>
                  Already over
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--kami-text-dim)" }}>
                  existing caffeine exceeds safe level
                </p>
              </>
            )}
          </div>
        </div>

        {/* Cleared by — secondary info */}
        {clearedTime !== null && (
          <div className="px-4 py-3 flex items-center justify-between" style={{
            ...cardStyle,
            border: "1px solid var(--kami-border)",
          }}>
            <p className="text-xs" style={{ color: "var(--kami-text-dim)" }}>
              Fully cleared (below 5%)
            </p>
            <p className="text-sm font-semibold tabular-nums" style={{ color: "var(--kami-text-muted)" }}>
              {formatTime(clearedTime % 24)}
            </p>
          </div>
        )}

        {/* Personality line */}
        {drinks.length > 0 && (
          <div className="p-4" style={{ ...cardStyle, borderLeft: "3px solid #f59e0b" }}>
            <p className="text-sm" style={{ color: "var(--kami-text-muted)" }}>
              {personality}
            </p>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
