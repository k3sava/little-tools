"use client";

import { useEffect, useState } from "react";

export interface CollectionHeaderProps {
  title: string;
  description: string;
  count: number;
  accentHex: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace(/^#/, "");
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

export function CollectionHeader({ title, description, count, accentHex }: CollectionHeaderProps) {
  const [currentTheme, setCurrentTheme] = useState<string>("default");

  useEffect(() => {
    function readTheme() {
      return document.documentElement.getAttribute("data-theme") || "default";
    }
    setCurrentTheme(readTheme());
    const obs = new MutationObserver(() => {
      setCurrentTheme(readTheme());
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  if (currentTheme === "glass") {
    const rgb = hexToRgb(accentHex);
    const gradientStyle = rgb
      ? {
          background: `linear-gradient(160deg,
            rgba(${rgb.r},${rgb.g},${rgb.b},0.12) 0%,
            rgba(${rgb.r},${rgb.g},${rgb.b},0.06) 50%,
            rgba(255,255,255,0.04) 100%)`,
        }
      : {};

    return (
      <div className="collection-glass-hero" style={gradientStyle}>
        <p className="collection-glass-hero-eyebrow">little tools</p>
        <h1 className="collection-glass-hero-title">{title}</h1>
        <p className="collection-glass-hero-sub">{description}</p>
        <span className="collection-glass-hero-count">{count} tools</span>
      </div>
    );
  }

  if (currentTheme === "material") {
    return (
      <div
        className="collection-material-header"
        style={{ borderBottom: `3px solid ${accentHex}` }}
      >
        <div className="collection-material-header-inner">
          <p className="collection-material-header-label">little tools</p>
          <h1 className="collection-material-header-title">{title}</h1>
          <p className="collection-material-header-desc">{description}</p>
          <span className="collection-material-header-chip">{count} tools</span>
        </div>
      </div>
    );
  }

  if (currentTheme === "metro") {
    return (
      <div className="collection-metro-header">
        <h1 className="collection-metro-title">{title}</h1>
        <p className="collection-metro-desc">{description}</p>
        <span className="collection-metro-count">{count} tools</span>
      </div>
    );
  }

  return null;
}
