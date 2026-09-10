import React, { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSV {
  h: number;
  s: number;
  v: number;
}

function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const bigint = parseInt(full, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function rgbToHsv({ r, g, b }: RGB): HSV {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (max !== min) {
    switch (max) {
      case nr:
        h = (ng - nb) / d + (ng < nb ? 6 : 0);
        break;
      case ng:
        h = (nb - nr) / d + 2;
        break;
      case nb:
        h = (nr - ng) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h, s, v };
}

function hsvToRgb({ h, s, v }: HSV): RGB {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0;
  let g = 0;
  let b = 0;
  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

export function hexToHsv(hex: string): HSV {
  return rgbToHsv(hexToRgb(hex));
}

export function hsvToHex(hsv: HSV): string {
  const { r, g, b } = hsvToRgb(hsv);
  return rgbToHex(r, g, b);
}

export function ColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (hex: string) => void;
}) {
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(color));
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHsv(hexToHsv(color));
  }, [color]);

  const updateFromSV = (clientX: number, clientY: number) => {
    if (!svRef.current) return;
    const rect = svRef.current.getBoundingClientRect();
    const s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    const next = { ...hsv, s, v };
    setHsv(next);
    onChange(hsvToHex(next));
  };

  const updateFromHue = (clientX: number) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const h = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const next = { ...hsv, h };
    setHsv(next);
    onChange(hsvToHex(next));
  };

  const svPointerHandlers = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      updateFromSV(e.clientX, e.clientY);
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.buttons === 1) updateFromSV(e.clientX, e.clientY);
    },
  };

  const huePointerHandlers = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      updateFromHue(e.clientX);
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.buttons === 1) updateFromHue(e.clientX);
    },
  };

  const hueDeg = Math.round(hsv.h * 360);

  return (
    <div className="w-64 rounded-xl border border-app bg-surface-2 p-3 shadow-2xl">
      {/* Saturation / Value box */}
      <div
        ref={svRef}
        className="relative h-40 w-full cursor-crosshair overflow-hidden rounded-lg"
        {...svPointerHandlers}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to right, #fff, hsl(${hueDeg}, 100%, 50%))`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, #000, transparent)" }}
        />
        <div
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            background: color,
          }}
        />
      </div>

      {/* Hue slider */}
      <div
        ref={hueRef}
        className="relative mt-3 h-3 w-full cursor-pointer rounded-full"
        style={{
          background:
            "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
        }}
        {...huePointerHandlers}
      >
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{
            left: `${hsv.h * 100}%`,
            background: `hsl(${hueDeg}, 100%, 50%)`,
          }}
        />
      </div>

      {/* Hex input */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs font-medium text-muted-fg">HEX</span>
        <input
          value={color.toUpperCase()}
          onChange={(e) => {
            let v = e.target.value;
            if (!v.startsWith("#")) v = "#" + v;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
              onChange(v.toUpperCase());
            }
          }}
          className="flex-1 rounded-md border border-app bg-surface px-2 py-1.5 text-sm font-medium uppercase text-base-fg outline-none transition focus:border-brand-500"
        />
        <div
          className="h-8 w-8 rounded-md border border-app shadow-sm"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

export function ColorControl({
  value,
  isActive,
  onToggle,
  onChange,
}: {
  value: string;
  isActive: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onToggle();
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isActive, onToggle]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "h-8 w-8 rounded-md border shadow-sm transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
            isActive ? "border-brand-500 ring-1 ring-brand-500/30" : "border-app"
          )}
          style={{ background: value }}
          aria-label="Edit color"
        />
        <input
          value={value.toUpperCase()}
          onChange={(e) => {
            let v = e.target.value;
            if (!v.startsWith("#")) v = "#" + v;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v.toUpperCase());
          }}
          className="flex-1 w-full rounded-lg bg-surface-2 text-base-fg text-sm placeholder:text-subtle-fg border transition-all duration-150 outline-none h-10 px-3.5 focus:border-brand-500/50"
        />
      </div>
      {isActive && (
        <div className="absolute left-0 top-full z-[100] mt-2">
          <ColorPicker color={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
