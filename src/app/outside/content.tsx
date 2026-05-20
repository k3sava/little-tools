"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ToolShell,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment } from "@/components/tools/controls";

// ---------------------------------------------------------------------------
// WMO weather code → condition
// ---------------------------------------------------------------------------

interface Condition {
  emoji: string;
  label: string;
  category: "clear" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "showers" | "storm";
  mood: string;
}

function codeToCondition(code: number): Condition {
  if (code === 0)         return { emoji: "☀️",  label: "Clear sky",       category: "clear",   mood: "Agreeable" };
  if (code === 1)         return { emoji: "🌤️",  label: "Mostly clear",    category: "clear",   mood: "Optimistic" };
  if (code === 2)         return { emoji: "⛅",   label: "Partly cloudy",   category: "cloudy",  mood: "Indecisive" };
  if (code === 3)         return { emoji: "☁️",  label: "Overcast",        category: "cloudy",  mood: "Noncommittal" };
  if (code <= 48)         return { emoji: "🌫️",  label: "Foggy",           category: "fog",     mood: "Mysterious" };
  if (code <= 57)         return { emoji: "🌦️",  label: "Drizzle",         category: "drizzle", mood: "Passive-aggressive" };
  if (code <= 67)         return { emoji: "🌧️",  label: "Rainy",           category: "rain",    mood: "Dramatic" };
  if (code <= 77)         return { emoji: "❄️",  label: "Snowy",           category: "snow",    mood: "Committed" };
  if (code <= 82)         return { emoji: "🌦️",  label: "Showers",         category: "showers", mood: "Moody" };
  if (code <= 86)         return { emoji: "🌨️",  label: "Snow showers",    category: "snow",    mood: "Extra" };
  return                  { emoji: "⛈️",  label: "Thunderstorm",    category: "storm",   mood: "Theatrical" };
}

// ---------------------------------------------------------------------------
// Temperature category
// ---------------------------------------------------------------------------

function tempCategory(c: number): "freezing" | "cold" | "cool" | "mild" | "warm" | "hot" {
  if (c < 0)   return "freezing";
  if (c < 10)  return "cold";
  if (c < 18)  return "cool";
  if (c < 24)  return "mild";
  if (c < 30)  return "warm";
  return "hot";
}

// ---------------------------------------------------------------------------
// Personality commentary
// ---------------------------------------------------------------------------

interface Personality {
  good: string[];
  bad: string[];
  closer: string;
}

function getPersonality(cat: Condition["category"], tempCat: string): Personality {
  if (cat === "storm") return {
    good: ["doomscrolling guiltlessly", "telling this story later"],
    bad: ["leaving", "anything involving electricity outdoors"],
    closer: "The weather has escalated. Respect it.",
  };
  if (cat === "snow") return {
    good: ["watching from indoors", "hot chocolate you earned by existing"],
    bad: ["commuting", "your back", "anyone who calls it picturesque"],
    closer: "Nature is doing the absolute most right now.",
  };
  if (cat === "rain" || cat === "drizzle" || cat === "showers") return {
    good: ["soup", "staying exactly where you are", "pretending you had plans"],
    bad: ["those plans you actually had", "the optimism from this morning"],
    closer: "Outside has cancelled itself. Valid.",
  };
  if (cat === "fog") return {
    good: ["a noir podcast", "dramatic pauses", "pretending you're in a film"],
    bad: ["driving fast", "certainty about anything"],
    closer: "The world has chosen mystery today.",
  };
  if (cat === "clear") {
    if (tempCat === "hot") return {
      good: ["doing nothing horizontal", "water", "shade you'll fight strangers for"],
      bad: ["ambition", "anything with sleeves", "the midday hours"],
      closer: "The sun has opinions. Strong, UV-indexed ones.",
    };
    if (tempCat === "freezing" || tempCat === "cold") return {
      good: ["a brisk walk you'll be smug about later", "coffee you actually deserve"],
      bad: ["anyone who calls this refreshing", "exposed skin"],
      closer: "Beautiful in theory. Brutal in practice.",
    };
    return {
      good: ["an aimless walk", "procrastinating outdoors", "believing things will work out"],
      bad: ["staying in and being productive", "excuses"],
      closer: "The weather is doing its part. Entirely up to you now.",
    };
  }
  // cloudy
  if (tempCat === "freezing" || tempCat === "cold") return {
    good: ["focus work", "a blanket you can justify", "indoor things"],
    bad: ["motivation", "vitamin D", "outdoor plans you made in summer"],
    closer: "The sky is thinking about it. So should you.",
  };
  return {
    good: ["deep work", "a mystery novel", "ambient melancholy"],
    bad: ["photography", "vitamin D", "anyone who needs sun to function"],
    closer: "The kind of day that doesn't ask much of you.",
  };
}

// ---------------------------------------------------------------------------
// Delta description
// ---------------------------------------------------------------------------

function describeDelta(delta: number, context: string): string {
  const abs = Math.abs(delta);
  if (abs < 0.8) return `About the same as ${context}.`;
  const dir = delta > 0 ? "warmer" : "colder";
  const deg = Math.round(abs);
  if (deg >= 8) return `${deg}° ${dir} than ${context}. Noticeably different.`;
  return `${deg}° ${dir} than ${context}.`;
}

// ---------------------------------------------------------------------------
// Weather state
// ---------------------------------------------------------------------------

type Units = "C" | "F";

interface WeatherData {
  currentTemp: number;
  apparentTemp: number;
  code: number;
  windSpeedMph: number;
  cityName: string;
  deltaYesterday: number | null;
  deltaMorning: number | null;
}

function toF(c: number) { return Math.round(c * 9 / 5 + 32); }
function showTemp(c: number, u: Units) { return u === "C" ? `${Math.round(c)}°C` : `${toF(c)}°F`; }

const ACCENT = "#0ea5e9";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OutsideContent() {

  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<Units>("C");

  const loadWeather = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 12000 })
      );
      const { latitude: lat, longitude: lon } = pos.coords;

      const wUrl = new URL("https://api.open-meteo.com/v1/forecast");
      wUrl.searchParams.set("latitude", String(lat));
      wUrl.searchParams.set("longitude", String(lon));
      wUrl.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,wind_speed_10m");
      wUrl.searchParams.set("hourly", "temperature_2m");
      wUrl.searchParams.set("past_days", "1");
      wUrl.searchParams.set("forecast_days", "1");
      wUrl.searchParams.set("timezone", "auto");
      wUrl.searchParams.set("wind_speed_unit", "mph");

      const [wRes, gRes] = await Promise.all([
        fetch(wUrl.toString()),
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`),
      ]);
      const weather = await wRes.json();
      const geo = await gRes.json().catch(() => ({}));

      const current = weather.current as {
        temperature_2m: number;
        apparent_temperature: number;
        weather_code: number;
        wind_speed_10m: number;
        time: string;
      };
      const hourlyTimes: string[] = weather.hourly.time;
      const hourlyTemps: number[] = weather.hourly.temperature_2m;

      // Find current hour index (format: "2026-05-18T14:00")
      const currentHour = current.time.slice(0, 13) + ":00";
      const currentIdx = hourlyTimes.findIndex(t => t.startsWith(currentHour.slice(0, 13)));
      const yesterdayIdx = currentIdx >= 24 ? currentIdx - 24 : -1;
      const deltaYesterday = yesterdayIdx >= 0
        ? current.temperature_2m - hourlyTemps[yesterdayIdx]
        : null;

      // 7am this morning
      const todayDate = current.time.slice(0, 10);
      const morningStr = `${todayDate}T07:00`;
      const morningIdx = hourlyTimes.findIndex(t => t === morningStr);
      const deltaMorning = morningIdx >= 0 && currentIdx !== morningIdx
        ? current.temperature_2m - hourlyTemps[morningIdx]
        : null;

      const addr = (geo as Record<string, unknown>).address as Record<string, string> | undefined;
      const cityName = addr?.city ?? addr?.town ?? addr?.village ?? addr?.county ?? "your area";

      setData({
        currentTemp: current.temperature_2m,
        apparentTemp: current.apparent_temperature,
        code: current.weather_code,
        windSpeedMph: current.wind_speed_10m,
        cityName,
        deltaYesterday,
        deltaMorning,
      });
    } catch (e) {
      if (e instanceof GeolocationPositionError) {
        setError("Location access is needed to check outside. Allow it in your browser settings, then try again.");
      } else {
        setError("Couldn't reach the weather service. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const cardStyle = {
    background: "var(--kami-surface-solid)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-card-radius, 0.75rem)",
  } as const;

  const condition = data ? codeToCondition(data.code) : null;
  const tempCat = data ? tempCategory(data.currentTemp) : "mild";
  const personality = data ? getPersonality(condition!.category, tempCat) : null;

  return (
    <ToolShell
      title="How's Outside?"
      tagline="Weather, without the numbers."
      accent={ACCENT}
      materialFab={{ label: "Refresh", onClick: loadWeather }}
      actions={
        data ? (
          <>
            <Segment
              value={units}
              options={[{ value: "C", label: "°C" }, { value: "F", label: "°F" }]}
              onChange={(v) => setUnits(v as Units)}
            />
            <ToolActionButton onClick={loadWeather} disabled={loading}>
              {loading ? "Checking…" : "Refresh"}
            </ToolActionButton>
          </>
        ) : undefined
      }
    >
      <div className="glass-canvas-section">
      {!data && !loading && !error && (
        <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
          <span style={{ fontSize: "4rem" }}>🌤️</span>
          <div>
            <p className="text-lg font-medium kami-text">
              Let&apos;s see what&apos;s happening outside.
            </p>
            <p className="mt-1 text-sm kami-text-dim">
              Needs your location to compare today to yesterday.
            </p>
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={loadWeather}
            onKeyDown={(e) => e.key === "Enter" && loadWeather()}
            style={{
              background: ACCENT,
              color: "#fff",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.5rem",
              fontWeight: 500,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "inline-block",
              userSelect: "none",
            }}
          >
            Check outside
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <p className="text-sm kami-text-dim">
            Checking outside…
          </p>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <p className="text-sm max-w-xs kami-text-dim">{error}</p>
          <div
            role="button"
            tabIndex={0}
            onClick={loadWeather}
            onKeyDown={(e) => e.key === "Enter" && loadWeather()}
            style={{
              background: ACCENT,
              color: "#fff",
              padding: "0.5rem 1.25rem",
              borderRadius: "0.5rem",
              fontWeight: 500,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "inline-block",
              userSelect: "none",
            }}
          >
            Try again
          </div>
        </div>
      )}

      {data && condition && personality && (
        <div className="flex flex-col gap-4 max-w-lg mx-auto w-full">
          {/* Location + mood */}
          <div className="p-6 flex flex-col gap-3" style={cardStyle}>
            <p className="text-xs uppercase tracking-widest kami-text-dim">
              {data.cityName}
            </p>
            <div className="flex items-center gap-3">
              <span style={{ fontSize: "2.5rem" }}>{condition.emoji}</span>
              <div>
                <p className="text-2xl font-bold kami-text">
                  {condition.mood}
                </p>
                <p className="text-sm mt-0.5 kami-text-dim">
                  {condition.label} · feels like {showTemp(data.apparentTemp, units)}
                </p>
              </div>
            </div>
            <div
              className="h-px w-full"
              style={{ background: "var(--kami-border-strong)" }}
            />
            <div className="flex flex-col gap-1">
              {data.deltaYesterday !== null && (
                <p className="text-sm kami-text-dim">
                  {describeDelta(data.deltaYesterday, "yesterday at this hour")}
                </p>
              )}
              {data.deltaMorning !== null && Math.abs(data.deltaMorning) >= 1 && (
                <p className="text-sm kami-text-dim">
                  {describeDelta(data.deltaMorning, "this morning")}
                </p>
              )}
              {data.windSpeedMph >= 15 && (
                <p className="text-sm kami-text-dim">
                  Wind at {Math.round(data.windSpeedMph)} mph. Factor that in.
                </p>
              )}
            </div>
          </div>

          {/* Personality */}
          <div className="p-5 flex flex-col gap-4" style={cardStyle}>
            <div>
              <p className="text-xs uppercase tracking-widest mb-2 kami-text-dim">
                Good for
              </p>
              <p className="text-sm leading-relaxed kami-text">
                {personality.good.join(", ")}.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest mb-2 kami-text-dim">
                Bad for
              </p>
              <p className="text-sm leading-relaxed kami-text">
                {personality.bad.join(", ")}.
              </p>
            </div>
            <p
              className="text-sm mt-1 italic border-t pt-3"
              style={{ color: "var(--kami-text-muted)", borderColor: "var(--kami-border-strong)" }}
            >
              {personality.closer}
            </p>
          </div>
        </div>
      )}
      </div>
    </ToolShell>
  );
}
