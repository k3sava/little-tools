"use client";

import { useEffect, useRef } from "react";

const BLOB_COLORS = [
  "rgba(0,113,227,0.09)",
  "rgba(191,90,242,0.08)",
  "rgba(255,55,95,0.08)",
  "rgba(52,199,89,0.09)",
  "rgba(235,235,240,0.30)",
];

interface BlobShape {
  x: number;
  y: number;
  r: number;
  pts: number;
  color: string;
  phase: number;
  speed: number;
  drift: { x: number; y: number };
  wobble: number;
  rot: number;
  rotSpeed: number;
  opacity: number;
}

function createBlob(W: number, H: number): BlobShape {
  return {
    x: Math.random() * W,
    y: Math.random() * H,
    r: 60 + Math.random() * 160,
    pts: 5 + Math.floor(Math.random() * 4),
    color: BLOB_COLORS[Math.floor(Math.random() * BLOB_COLORS.length)],
    phase: Math.random() * Math.PI * 2,
    speed: 0.0006 + Math.random() * 0.0008,
    drift: { x: (Math.random() - 0.5) * 0.08, y: (Math.random() - 0.5) * 0.06 },
    wobble: 0.18 + Math.random() * 0.14,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.0008,
    opacity: Math.random(),
  };
}

function drawBlob(ctx: CanvasRenderingContext2D, blob: BlobShape, time: number, W: number, H: number) {
  blob.x += blob.drift.x;
  blob.y += blob.drift.y;
  blob.rot += blob.rotSpeed;
  if (blob.x < -blob.r * 2) blob.x = W + blob.r;
  if (blob.x > W + blob.r * 2) blob.x = -blob.r;
  if (blob.y < -blob.r * 2) blob.y = H + blob.r;
  if (blob.y > H + blob.r * 2) blob.y = -blob.r;

  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < blob.pts; i++) {
    const a = (i / blob.pts) * Math.PI * 2 + blob.rot;
    const w = Math.sin(time * blob.speed + blob.phase + i * 1.3) * blob.wobble;
    const r2 = blob.r * (1 + w);
    pts.push({ x: blob.x + Math.cos(a) * r2, y: blob.y + Math.sin(a) * r2 });
  }

  const n = pts.length;
  if (n < 3) return;

  ctx.save();
  ctx.globalAlpha = blob.opacity;
  ctx.beginPath();
  for (let j = 0; j < n; j++) {
    const p0 = pts[(j - 1 + n) % n];
    const p1 = pts[j];
    const p2 = pts[(j + 1) % n];
    const p3 = pts[(j + 2) % n];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    if (j === 0) ctx.moveTo(p1.x, p1.y);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
  ctx.closePath();
  ctx.fillStyle = blob.color;
  ctx.fill();
  ctx.restore();
}

export function BlobCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let shapes: BlobShape[] = [];
    let raf: number;

    function resize() {
      W = canvas!.width = window.innerWidth;
      H = canvas!.height = window.innerHeight;
    }

    function init() {
      shapes = [];
      for (let i = 0; i < 7; i++) shapes.push(createBlob(W, H));
    }

    function animate(time: number) {
      ctx!.clearRect(0, 0, W, H);
      shapes.forEach((s) => drawBlob(ctx!, s, time, W, H));
      raf = requestAnimationFrame(animate);
    }

    resize();
    init();
    raf = requestAnimationFrame(animate);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
