"use client";

import { useState, useCallback, useMemo } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

// --- Types ---

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

const THEMES: Record<Theme, { bg: string; card: string; text: string; accent: string; btnBg: string; btnText: string; btnBorder: string }> = {
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

// --- Social icon detection ---

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

// --- HTML generation ---

function generateHTML(profile: Profile): string {
  const t = THEMES[profile.theme];
  const isGradient = t.bg.startsWith("linear");
  const bgStyle = isGradient ? `background: ${t.bg}` : `background-color: ${t.bg}`;
  const avatarHTML = profile.avatar
    ? `<img src="${escapeHtml(profile.avatar)}" alt="" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin-bottom:12px;" />`
    : `<div style="width:80px;height:80px;border-radius:50%;${isGradient ? "background:rgba(255,255,255,0.2)" : "background-color:#e5e7eb"};display:flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:32px;color:${t.text};">${profile.name.charAt(0).toUpperCase()}</div>`;

  const itemsHTML = profile.links
    .filter((l) => l.type === "header" ? l.label : l.label && l.url)
    .map((l) => {
      if (l.type === "header") {
        return `<div style="padding:8px 0 4px;text-align:center;font-size:13px;font-weight:600;color:${t.text};letter-spacing:0.05em;text-transform:uppercase;opacity:0.7;">${escapeHtml(l.label)}</div>`;
      }
      const platform = detectPlatform(l.url);
      const displayLabel = platform ? `[${platform}] ${l.label}` : l.label;
      return `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer" style="display:block;width:100%;padding:14px 20px;border-radius:12px;background:${t.btnBg};color:${t.btnText};border:1px solid ${t.btnBorder};text-decoration:none;text-align:center;font-size:15px;font-weight:500;transition:opacity 0.15s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">${escapeHtml(displayLabel)}</a>`;
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

// --- Component ---

export default function LinkInBioContent() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [copied, setCopied] = useState(false);

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

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => exportHTML(), label: "Save" },
  ], [exportHTML]));

  const copyHTML = useCallback(() => {
    navigator.clipboard.writeText(generateHTML(profile));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [profile]);

  const handleAvatarUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [update]);

  const t = THEMES[profile.theme];
  const isGradient = t.bg.startsWith("linear");

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Link-in-Bio Builder</h1>
        <p className="mt-2 text-gray-500">
          Create a simple link page. Customize, preview, and export as a standalone HTML file.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Editor */}
          <div className="space-y-4">
            {/* Profile */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Profile</h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => update({ name: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Bio</label>
                  <input
                    type="text"
                    value={profile.bio}
                    onChange={(e) => update({ bio: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Avatar (optional, &lt;500KB)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="text-xs text-gray-500 file:mr-2 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs file:text-gray-600 hover:file:bg-gray-200"
                    />
                    {profile.avatar && (
                      <button
                        onClick={() => update({ avatar: "" })}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Links & Sections</h3>
              <div className="space-y-2">
                {profile.links.map((link, idx) => (
                  <div
                    key={link.id}
                    className={`flex items-start gap-2 rounded-lg border p-3 ${
                      link.type === "header"
                        ? "border-gray-300 bg-gray-100"
                        : "border-gray-100 "
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 pt-1">
                      <button
                        onClick={() => moveLink(link.id, -1)}
                        disabled={idx === 0}
                        className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Move up"
                      >
                        &uarr;
                      </button>
                      <button
                        onClick={() => moveLink(link.id, 1)}
                        disabled={idx === profile.links.length - 1}
                        className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Move down"
                      >
                        &darr;
                      </button>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {link.type === "header" ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider">Header</span>
                          <input
                            type="text"
                            value={link.label}
                            onChange={(e) => updateLink(link.id, { label: e.target.value })}
                            placeholder="Section title"
                            className="flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm font-semibold focus:border-gray-400 focus:outline-none"
                          />
                        </div>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={link.label}
                            onChange={(e) => updateLink(link.id, { label: e.target.value })}
                            placeholder="Label"
                            className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:border-gray-400 focus:outline-none"
                          />
                          <div className="flex items-center gap-1.5">
                            <input
                              type="url"
                              value={link.url}
                              onChange={(e) => updateLink(link.id, { url: e.target.value })}
                              placeholder="https://..."
                              className="flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:border-gray-400 focus:outline-none"
                            />
                            {link.url && detectPlatform(link.url) && (
                              <span className="whitespace-nowrap rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                                {detectPlatform(link.url)}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => removeLink(link.id)}
                      className="mt-1 text-xs text-gray-400 hover:text-red-500"
                      title="Remove"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={addLink}
                  className="flex-1 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700"
                >
                  + Add Link
                </button>
                <button
                  onClick={addHeader}
                  className="rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700"
                >
                  + Add Header
                </button>
              </div>
            </div>

            {/* Theme */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Theme</h3>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(THEMES) as Theme[]).map((key) => {
                  const th = THEMES[key];
                  const isGrad = th.bg.startsWith("linear");
                  return (
                    <button
                      key={key}
                      onClick={() => update({ theme: key })}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs capitalize transition-all ${
                        profile.theme === key
                          ? "ring-2 ring-gray-900 ring-offset-1"
                          : "border border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-gray-200"
                        style={{ background: isGrad ? th.bg : th.bg }}
                      />
                      {key}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Export */}
            <div className="flex gap-2">
              <button
                onClick={exportHTML}
                className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
              >
                Download HTML
              </button>
              <button
                onClick={copyHTML}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                {copied ? "Copied!" : "Copy HTML"}
              </button>
            </div>
          </div>

          {/* Live Preview — Phone Frame */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="mb-2 text-center text-xs text-gray-400">Preview</div>
              {/* Phone frame */}
              <div
                className="mx-auto"
                style={{
                  width: 320,
                  maxWidth: "100%",
                  borderRadius: 40,
                  border: "6px solid #1f2937",
                  overflow: "hidden",
                  position: "relative",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                }}
              >
                {/* Notch */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 120,
                    height: 28,
                    backgroundColor: "#1f2937",
                    borderRadius: "0 0 16px 16px",
                    zIndex: 10,
                  }}
                >
                  {/* Camera dot */}
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 24,
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: "#374151",
                      border: "2px solid #4b5563",
                    }}
                  />
                </div>
                {/* Status bar */}
                <div
                  style={{
                    height: 44,
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    padding: "0 20px 4px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: isGradient ? "#fff" : t.text,
                    ...(isGradient ? { background: t.bg } : { backgroundColor: t.bg }),
                  }}
                >
                  <span>9:41</span>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {/* Signal bars */}
                    <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                      <rect x="0" y="9" width="3" height="3" rx="0.5" fill="currentColor" />
                      <rect x="4.5" y="6" width="3" height="6" rx="0.5" fill="currentColor" />
                      <rect x="9" y="3" width="3" height="9" rx="0.5" fill="currentColor" />
                      <rect x="13" y="0" width="3" height="12" rx="0.5" fill="currentColor" opacity="0.3" />
                    </svg>
                    {/* Battery */}
                    <svg width="22" height="11" viewBox="0 0 22 11" fill="none">
                      <rect x="0.5" y="0.5" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1" />
                      <rect x="2" y="2" width="12" height="7" rx="1" fill="currentColor" />
                      <rect x="19.5" y="3" width="2" height="5" rx="1" fill="currentColor" opacity="0.4" />
                    </svg>
                  </div>
                </div>
                {/* Phone content */}
                <div
                  style={{
                    minHeight: 560,
                    ...(isGradient ? { background: t.bg } : { backgroundColor: t.bg }),
                    padding: "16px 16px 32px",
                    overflowY: "auto",
                  }}
                >
                  {/* Avatar */}
                  <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
                    {profile.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatar}
                        alt=""
                        style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", marginBottom: 10 }}
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
                          marginBottom: 10,
                          fontSize: 26,
                          fontWeight: 700,
                          color: t.text,
                        }}
                      >
                        {profile.name.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                    <div style={{ fontSize: 18, fontWeight: 700, color: t.text }}>{profile.name || "Your Name"}</div>
                    <div style={{ fontSize: 12, color: t.accent, marginTop: 2 }}>{profile.bio}</div>
                  </div>

                  {/* Links and headers */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {profile.links
                      .filter((l) => l.type === "header" ? l.label : l.label)
                      .map((link) => {
                        if (link.type === "header") {
                          return (
                            <div
                              key={link.id}
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
                              {link.label}
                            </div>
                          );
                        }
                        const platform = detectPlatform(link.url);
                        return (
                          <div
                            key={link.id}
                            style={{
                              padding: "11px 16px",
                              borderRadius: 10,
                              background: t.btnBg,
                              border: `1px solid ${t.btnBorder}`,
                              textAlign: "center",
                              fontSize: 13,
                              fontWeight: 500,
                              color: t.btnText,
                              cursor: "default",
                            }}
                          >
                            {platform && (
                              <span style={{ opacity: 0.6, marginRight: 4, fontSize: 11 }}>
                                [{platform}]
                              </span>
                            )}
                            {link.label}
                          </div>
                        );
                      })}
                  </div>

                  <div style={{ textAlign: "center", marginTop: 32, fontSize: 10, color: t.accent }}>
                    Made with kami
                  </div>
                </div>
                {/* Home indicator bar */}
                <div
                  style={{
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...(isGradient ? { background: t.bg } : { backgroundColor: t.bg }),
                  }}
                >
                  <div
                    style={{
                      width: 100,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: isGradient ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.15)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
