"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Select } from "@/components/tools/controls";

interface LinkItem {
  id: string;
  type: "link" | "header";
  label: string;
  url: string;
}

interface Profile {
  name: string;
  bio: string;
  avatar: string;
  links: LinkItem[];
  theme: Theme;
}

type Theme =
  | "light"
  | "dark"
  | "gradient"
  | "ocean"
  | "sunset"
  | "forest"
  | "midnight"
  | "neon"
  | "pastel"
  | "monochrome"
  | "coral"
  | "aurora"
  | "coffee"
  | "lavender"
  | "candy";

const ACCENT = "#f43f5e";

const THEMES: Record<
  Theme,
  { bg: string; card: string; text: string; accent: string; btnBg: string; btnText: string; btnBorder: string }
> = {
  light: { bg: "#f9fafb", card: "#ffffff", text: "#111827", accent: "#6b7280", btnBg: "#ffffff", btnText: "#111827", btnBorder: "#e5e7eb" },
  dark: { bg: "#111827", card: "#1f2937", text: "#f9fafb", accent: "#9ca3af", btnBg: "#1f2937", btnText: "#f9fafb", btnBorder: "#374151" },
  gradient: { bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", card: "rgba(255,255,255,0.15)", text: "#ffffff", accent: "rgba(255,255,255,0.7)", btnBg: "rgba(255,255,255,0.2)", btnText: "#ffffff", btnBorder: "rgba(255,255,255,0.3)" },
  ocean: { bg: "linear-gradient(135deg, #0f766e 0%, #0284c7 100%)", card: "rgba(255,255,255,0.12)", text: "#ffffff", accent: "rgba(255,255,255,0.7)", btnBg: "rgba(255,255,255,0.18)", btnText: "#ffffff", btnBorder: "rgba(255,255,255,0.25)" },
  sunset: { bg: "linear-gradient(135deg, #f97316 0%, #ec4899 100%)", card: "rgba(255,255,255,0.15)", text: "#ffffff", accent: "rgba(255,255,255,0.75)", btnBg: "rgba(255,255,255,0.2)", btnText: "#ffffff", btnBorder: "rgba(255,255,255,0.3)" },
  forest: { bg: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)", card: "rgba(255,255,255,0.1)", text: "#ecfdf5", accent: "rgba(209,250,229,0.7)", btnBg: "rgba(255,255,255,0.15)", btnText: "#ecfdf5", btnBorder: "rgba(167,243,208,0.3)" },
  midnight: { bg: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%)", card: "rgba(255,255,255,0.08)", text: "#e0e7ff", accent: "rgba(199,210,254,0.7)", btnBg: "rgba(255,255,255,0.12)", btnText: "#e0e7ff", btnBorder: "rgba(165,180,252,0.3)" },
  neon: { bg: "#0a0a0a", card: "#141414", text: "#39ff14", accent: "rgba(57,255,20,0.6)", btnBg: "#141414", btnText: "#39ff14", btnBorder: "#39ff14" },
  pastel: { bg: "linear-gradient(135deg, #fce4ec 0%, #e3f2fd 100%)", card: "rgba(255,255,255,0.7)", text: "#4a4a4a", accent: "#8e8e8e", btnBg: "rgba(255,255,255,0.8)", btnText: "#4a4a4a", btnBorder: "rgba(0,0,0,0.08)" },
  monochrome: { bg: "#ffffff", card: "#f5f5f5", text: "#000000", accent: "#666666", btnBg: "#000000", btnText: "#ffffff", btnBorder: "#000000" },
  coral: { bg: "linear-gradient(135deg, #ff6b6b 0%, #ffa07a 50%, #ffd1a4 100%)", card: "rgba(255,255,255,0.2)", text: "#ffffff", accent: "rgba(255,255,255,0.75)", btnBg: "rgba(255,255,255,0.25)", btnText: "#ffffff", btnBorder: "rgba(255,255,255,0.35)" },
  aurora: { bg: "linear-gradient(135deg, #0f172a 0%, #065f46 33%, #7c3aed 66%, #0ea5e9 100%)", card: "rgba(255,255,255,0.1)", text: "#f0fdf4", accent: "rgba(255,255,255,0.65)", btnBg: "rgba(255,255,255,0.15)", btnText: "#f0fdf4", btnBorder: "rgba(255,255,255,0.25)" },
  coffee: { bg: "linear-gradient(135deg, #3e2723 0%, #5d4037 50%, #795548 100%)", card: "rgba(255,255,255,0.1)", text: "#efebe9", accent: "rgba(215,204,200,0.7)", btnBg: "rgba(255,255,255,0.12)", btnText: "#efebe9", btnBorder: "rgba(188,170,164,0.3)" },
  lavender: { bg: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 50%, #c4b5fd 100%)", card: "rgba(255,255,255,0.15)", text: "#ffffff", accent: "rgba(255,255,255,0.7)", btnBg: "rgba(255,255,255,0.2)", btnText: "#ffffff", btnBorder: "rgba(255,255,255,0.3)" },
  candy: { bg: "linear-gradient(135deg, #ec4899 0%, #f59e0b 100%)", card: "rgba(255,255,255,0.2)", text: "#ffffff", accent: "rgba(255,255,255,0.8)", btnBg: "rgba(255,255,255,0.25)", btnText: "#ffffff", btnBorder: "rgba(255,255,255,0.35)" },
};

const DEFAULT_PROFILE: Profile = {
  name: "Your Name",
  bio: "Designer & Developer",
  avatar: "",
  links: [
    { id: "1", type: "link", label: "My Website", url: "https://example.com" },
    { id: "2", type: "link", label: "Twitter", url: "https://twitter.com" },
    { id: "3", type: "link", label: "GitHub", url: "https://github.com" },
  ],
  theme: "light",
};

let nextId = 100;

const SOCIAL_PLATFORMS: { pattern: RegExp; label: string }[] = [
  { pattern: /(?:twitter\.com|x\.com)/i, label: "Twitter" },
  { pattern: /github\.com/i, label: "GitHub" },
  { pattern: /linkedin\.com/i, label: "LinkedIn" },
  { pattern: /instagram\.com/i, label: "Instagram" },
  { pattern: /youtube\.com|youtu\.be/i, label: "YouTube" },
  { pattern: /tiktok\.com/i, label: "TikTok" },
  { pattern: /dribbble\.com/i, label: "Dribbble" },
  { pattern: /behance\.net/i, label: "Behance" },
  { pattern: /medium\.com/i, label: "Medium" },
  { pattern: /facebook\.com/i, label: "Facebook" },
  { pattern: /pinterest\.com/i, label: "Pinterest" },
  { pattern: /twitch\.tv/i, label: "Twitch" },
  { pattern: /reddit\.com/i, label: "Reddit" },
  { pattern: /discord\.gg|discord\.com/i, label: "Discord" },
  { pattern: /spotify\.com/i, label: "Spotify" },
  { pattern: /threads\.net/i, label: "Threads" },
  { pattern: /mastodon/i, label: "Mastodon" },
];

function detectPlatform(url: string): string | null {
  for (const p of SOCIAL_PLATFORMS) {
    if (p.pattern.test(url)) return p.label;
  }
  return null;
}

function generateHTML(profile: Profile): string {
  const t = THEMES[profile.theme];
  const isGradient = t.bg.startsWith("linear");
  const bgStyle = isGradient ? `background: ${t.bg}` : `background-color: ${t.bg}`;
  const avatarHTML = profile.avatar
    ? `<img src="${escapeHtml(profile.avatar)}" alt="" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin-bottom:12px;" />`
    : `<div style="width:80px;height:80px;border-radius:50%;${isGradient ? "background:rgba(255,255,255,0.2)" : "background-color:#e5e7eb"};display:flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:32px;color:${t.text};">${profile.name.charAt(0).toUpperCase()}</div>`;

  const itemsHTML = profile.links
    .filter((l) => (l.type === "header" ? l.label : l.label && l.url))
    .map((l) => {
      if (l.type === "header") {
        return `<div style="padding:8px 0 4px;text-align:center;font-size:13px;font-weight:600;color:${t.text};letter-spacing:0.05em;text-transform:uppercase;opacity:0.7;">${escapeHtml(l.label)}</div>`;
      }
      const platform = detectPlatform(l.url);
      const displayLabel = platform ? `[${platform}] ${l.label}` : l.label;
      return `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer" style="display:block;width:100%;padding:14px 20px;border-radius:12px;background:${t.btnBg};color:${t.btnText};border:1px solid ${t.btnBorder};text-decoration:none;text-align:center;font-size:15px;font-weight:500;">${escapeHtml(displayLabel)}</a>`;
    })
    .join("\n      ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(profile.name)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { min-height: 100vh; ${bgStyle}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; padding: 40px 16px; }
  </style>
</head>
<body>
  <div style="width:100%;max-width:420px;">
    <div style="text-align:center;margin-bottom:32px;display:flex;flex-direction:column;align-items:center;">
      ${avatarHTML}
      <h1 style="font-size:22px;font-weight:700;color:${t.text};margin-bottom:4px;">${escapeHtml(profile.name)}</h1>
      <p style="font-size:14px;color:${t.accent};">${escapeHtml(profile.bio)}</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;">
      ${itemsHTML}
    </div>
    <p style="text-align:center;margin-top:40px;font-size:11px;color:${t.accent};">Made with kami</p>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default function LinkInBioContent() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [copied, setCopied] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>("default");
  const [metroCPivot, setMetroCPivot] = useState<string>("input");

  useEffect(() => {
    function readTheme() {
      return document.documentElement.getAttribute("data-theme") || "default";
    }
    setCurrentTheme(readTheme());
    const obs = new MutationObserver(() => setCurrentTheme(readTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const isMetro = currentTheme === "metro";

  const update = useCallback((patch: Partial<Profile>) => {
    setProfile((p) => ({ ...p, ...patch }));
  }, []);

  const updateLink = useCallback((id: string, patch: Partial<LinkItem>) => {
    setProfile((p) => ({
      ...p,
      links: p.links.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  }, []);

  const addLink = useCallback(() => {
    setProfile((p) => ({
      ...p,
      links: [...p.links, { id: String(nextId++), type: "link", label: "", url: "" }],
    }));
  }, []);

  const addHeader = useCallback(() => {
    setProfile((p) => ({
      ...p,
      links: [...p.links, { id: String(nextId++), type: "header", label: "Section", url: "" }],
    }));
  }, []);

  const removeLink = useCallback((id: string) => {
    setProfile((p) => ({ ...p, links: p.links.filter((l) => l.id !== id) }));
  }, []);

  const moveLink = useCallback((id: string, dir: -1 | 1) => {
    setProfile((p) => {
      const idx = p.links.findIndex((l) => l.id === id);
      if (idx < 0) return p;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= p.links.length) return p;
      const links = [...p.links];
      [links[idx], links[newIdx]] = [links[newIdx], links[idx]];
      return { ...p, links };
    });
  }, []);

  const onDragStart = (id: string) => setDragId(id);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    setProfile((p) => {
      const from = p.links.findIndex((l) => l.id === dragId);
      const to = p.links.findIndex((l) => l.id === targetId);
      if (from < 0 || to < 0) return p;
      const links = [...p.links];
      const [moved] = links.splice(from, 1);
      links.splice(to, 0, moved);
      return { ...p, links };
    });
    setDragId(null);
  };

  const exportHTML = useCallback(() => {
    const html = generateHTML(profile);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile.name.toLowerCase().replace(/\s+/g, "-") || "links"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [profile]);

  useKeyboardShortcuts(
    useMemo(
      () => [{ key: "Enter", meta: true, action: () => exportHTML(), label: "Save" }],
      [exportHTML]
    )
  );

  const copyHTML = useCallback(() => {
    navigator.clipboard.writeText(generateHTML(profile));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [profile]);

  const handleAvatarUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 500_000) {
        alert("Image must be under 500KB for inline embedding.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        update({ avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    },
    [update]
  );

  const t = THEMES[profile.theme];
  const isGradient = t.bg.startsWith("linear");

  const inputStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 40,
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid var(--kami-border-strong)",
    background: "var(--kami-input-bg, var(--kami-surface-solid))",
    color: "var(--kami-text)",
    outline: "none",
    fontSize: 14,
  };

  const actions = (
    <>
      <ToolActionButton variant="ghost" onClick={copyHTML}>
        {copied ? "Copied!" : "Copy HTML"}
      </ToolActionButton>
      <ToolActionButton variant="solid" onClick={exportHTML}>
        Export HTML
      </ToolActionButton>
    </>
  );

  const controls = (
    <>
      <ControlGroup label="Profile">
        <input
          type="text"
          value={profile.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Name"
          style={inputStyle}
        />
        <input
          type="text"
          value={profile.bio}
          onChange={(e) => update({ bio: e.target.value })}
          placeholder="Bio"
          style={inputStyle}
        />
        <div>
          <label
            className="mb-1 block text-[10px] uppercase"
            style={{ color: "var(--kami-text-muted)" }}
          >
            Avatar (≤500KB)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="text-xs"
            />
            {profile.avatar && (
              <button
                onClick={() => update({ avatar: "" })}
                className="text-xs"
                style={{ color: "color-mix(in srgb, #ef4444 70%, var(--kami-text))" }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </ControlGroup>

      <ControlGroup label="Theme">
        <Select<Theme>
          value={profile.theme}
          onChange={(v) => update({ theme: v })}
          options={(Object.keys(THEMES) as Theme[]).map((th) => ({ value: th, label: th }))}
        />
        <div className="grid grid-cols-5 gap-1.5">
          {(Object.keys(THEMES) as Theme[]).map((th) => {
            const colors = THEMES[th];
            return (
              <button
                key={th}
                type="button"
                onClick={() => update({ theme: th })}
                className="h-8 rounded-md"
                title={th}
                style={{
                  background: colors.bg,
                  outline: profile.theme === th ? `2px solid ${ACCENT}` : "none",
                  outlineOffset: 2,
                }}
              />
            );
          })}
        </div>
      </ControlGroup>

      <ControlGroup label="Items">
        <div className="flex gap-2">
          <button onClick={addLink} className="tool-action-btn" data-variant="outline">
            + Link
          </button>
          <button onClick={addHeader} className="tool-action-btn" data-variant="outline">
            + Header
          </button>
        </div>
      </ControlGroup>
    </>
  );

  return (
    <ToolShell
      title="Link-in-Bio Builder"
      tagline="Tiny Linktree-style page, exported as a single HTML file."
      accent={ACCENT}
      actions={actions}
      controls={controls}
      controlsLabel="Design"
    >
      {isMetro && (
        <nav className="metro-pivot" role="tablist" aria-label="View" style={{ borderBottom: "1px solid var(--kami-border)", padding: "0 16px" }}>
          <button role="tab" aria-selected={metroCPivot === "input"}
            className={`metro-pivot-item${metroCPivot === "input" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("input")}>Links</button>
          <button role="tab" aria-selected={metroCPivot === "output"}
            className={`metro-pivot-item${metroCPivot === "output" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("output")}>Preview</button>
        </nav>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {(!isMetro || metroCPivot === "input") && <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase" style={{ color: "var(--kami-text-muted)" }}>
            Links
          </h2>
          {profile.links.map((link, idx) => (
            <div
              key={link.id}
              draggable
              onDragStart={() => onDragStart(link.id)}
              onDragOver={onDragOver}
              onDrop={() => onDropOn(link.id)}
              className="flex items-start gap-2 rounded-lg border p-3"
              style={{
                background: link.type === "header" ? "var(--kami-surface)" : "var(--kami-surface-solid)",
                borderColor: dragId === link.id ? ACCENT : "var(--kami-border-strong)",
                cursor: "grab",
              }}
            >
              <div className="flex flex-col gap-0.5 pt-1 text-xs">
                <button
                  onClick={() => moveLink(link.id, -1)}
                  disabled={idx === 0}
                  className="tool-shell-icon-btn"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveLink(link.id, 1)}
                  disabled={idx === profile.links.length - 1}
                  className="tool-shell-icon-btn"
                >
                  ↓
                </button>
              </div>
              <div className="flex-1 space-y-1.5">
                {link.type === "header" ? (
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => updateLink(link.id, { label: e.target.value })}
                    placeholder="Section title"
                    style={{ ...inputStyle, fontWeight: 600 }}
                  />
                ) : (
                  <>
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => updateLink(link.id, { label: e.target.value })}
                      placeholder="Label"
                      style={inputStyle}
                    />
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => updateLink(link.id, { url: e.target.value })}
                      placeholder="https://"
                      style={inputStyle}
                    />
                    {link.url && detectPlatform(link.url) && (
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-[10px]"
                        style={{
                          background: `color-mix(in srgb, ${ACCENT} 15%, transparent)`,
                          color: ACCENT,
                        }}
                      >
                        {detectPlatform(link.url)}
                      </span>
                    )}
                  </>
                )}
              </div>
              <button onClick={() => removeLink(link.id)} className="tool-shell-icon-btn">
                ✕
              </button>
            </div>
          ))}
        </section>}

        {(!isMetro || metroCPivot === "output") && <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase" style={{ color: "var(--kami-text-muted)" }}>
            Mobile preview
          </h2>
          <div
            className="mx-auto w-full max-w-[360px] overflow-hidden rounded-[36px] border-[8px]"
            style={{
              borderColor: "var(--kami-border-strong)",
              boxShadow: "var(--kami-card-shadow, 0 10px 30px rgba(0,0,0,0.15))",
            }}
          >
            <div
              className="flex justify-center p-6"
              style={{
                background: isGradient ? t.bg : t.bg,
                minHeight: 600,
              }}
            >
              <div style={{ width: "100%", maxWidth: 320 }}>
                <div
                  style={{
                    textAlign: "center",
                    marginBottom: 24,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  {profile.avatar ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={profile.avatar}
                      alt=""
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        objectFit: "cover",
                        marginBottom: 12,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: isGradient ? "rgba(255,255,255,0.2)" : "#e5e7eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 12,
                        fontSize: 24,
                        color: t.text,
                      }}
                    >
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <p style={{ fontSize: 18, fontWeight: 700, color: t.text }}>{profile.name}</p>
                  <p style={{ fontSize: 13, color: t.accent }}>{profile.bio}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {profile.links.map((l) =>
                    l.type === "header" ? (
                      <div
                        key={l.id}
                        style={{
                          padding: "8px 0 4px",
                          textAlign: "center",
                          fontSize: 11,
                          fontWeight: 600,
                          color: t.text,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          opacity: 0.7,
                        }}
                      >
                        {l.label}
                      </div>
                    ) : (
                      <div
                        key={l.id}
                        style={{
                          padding: "12px 16px",
                          borderRadius: 10,
                          background: t.btnBg,
                          color: t.btnText,
                          border: `1px solid ${t.btnBorder}`,
                          textAlign: "center",
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        {l.label || "(empty)"}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>}
      </div>
    </ToolShell>
  );
}
