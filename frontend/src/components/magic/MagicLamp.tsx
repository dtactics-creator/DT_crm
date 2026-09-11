import { useCallback, useEffect, useRef, useState } from "react";

type Sparkle = { id: number; x: number; y: number; tx: number; ty: number; size: number };

const THRESHOLD = 100;

export function MagicLamp({
  onReveal,
  disabled,
  lampImage = "/magic-lamp.png"
}: {
  onReveal: () => void;
  disabled: boolean;
  lampImage?: string;
}) {
  const [energy, setEnergy] = useState(0);
  const [rubbing, setRubbing] = useState(false);
  const [bursting, setBursting] = useState(false);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  const areaRef = useRef<HTMLDivElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const active = useRef(false);
  const sparkleId = useRef(0);
  const firedRef = useRef(false);
  const startedRef = useRef(false);
  const milestonesRef = useRef<Set<number>>(new Set());
  // Mock sounds/analytics for generic template component
  const rub = useCallback(() => {}, []);
  const chime = useCallback(() => {}, []);
  const trackEvent = useCallback((e: any) => console.log('Track event', e), []);

  // Log abandonment if the user started rubbing but never triggered the reveal.
  useEffect(() => {
    return () => {
      if (startedRef.current && !firedRef.current) {
        trackEvent({ event_type: "rub_abandoned" });
      }
    };
  }, [trackEvent]);

  // Idle decay so the meter slowly drains if the user stops.
  useEffect(() => {
    if (disabled || bursting) return;
    const t = setInterval(() => {
      setEnergy((e) => (active.current || e <= 0 ? e : Math.max(0, e - 1.2)));
    }, 120);
    return () => clearInterval(t);
  }, [disabled, bursting]);

  const spawnSparkles = useCallback((x: number, y: number, n: number) => {
    const next: Sparkle[] = [];
    for (let i = 0; i < n; i++) {
      const id = sparkleId.current++;
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 60;
      next.push({
        id,
        x,
        y,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist - 20,
        size: 4 + Math.random() * 8,
      });
    }
    setSparkles((s) => [...s.slice(-40), ...next]);
    setTimeout(() => {
      const ids = new Set(next.map((s) => s.id));
      setSparkles((s) => s.filter((sp) => !ids.has(sp.id)));
    }, 700);
  }, []);

  const triggerBurst = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    active.current = false;
    setRubbing(false);
    setBursting(true);
    chime();
    setTimeout(() => onReveal(), 1100);
    setTimeout(() => {
      setBursting(false);
      setEnergy(0);
      firedRef.current = false;
    }, 2000);
  }, [chime, onReveal]);

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!active.current || disabled) return;
      const rect = areaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (lastPos.current) {
        const dx = x - lastPos.current.x;
        const dy = y - lastPos.current.y;
        const d = Math.hypot(dx, dy);
        if (d > 2) {
          setEnergy((e) => {
            const nv = Math.min(THRESHOLD, e + d * 0.12);
            for (const m of [25, 50, 75, 100]) {
              if (nv >= m && !milestonesRef.current.has(m)) {
                milestonesRef.current.add(m);
                trackEvent({ event_type: "energy_milestone", milestone: m });
              }
            }
            if (nv >= THRESHOLD) triggerBurst();
            return nv;
          });
          if (d > 8) {
            spawnSparkles(x, y, 2);
            if (Math.random() > 0.7) rub();
          }
        }
      }
      lastPos.current = { x, y };
    },
    [disabled, rub, spawnSparkles, triggerBurst],
  );

  const start = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled) return;
      active.current = true;
      setRubbing(true);
      if (!startedRef.current) {
        startedRef.current = true;
        trackEvent({ event_type: "rub_started" });
      }
      lastPos.current = null;
      handleMove(clientX, clientY);
    },
    [disabled, handleMove],
  );

  const end = useCallback(() => {
    active.current = false;
    setRubbing(false);
    lastPos.current = null;
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (active.current) e.preventDefault();
      const t = e.touches[0];
      if (t) handleMove(t.clientX, t.clientY);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", end);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", end);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", end);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", end);
    };
  }, [handleMove, end]);

  const pct = Math.round(energy);
  const glow = 0.25 + (energy / THRESHOLD) * 0.75;

  return (
    <div className="flex flex-col items-center">
      <div
        ref={areaRef}
        onMouseDown={(e) => start(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) start(t.clientX, t.clientY);
        }}
        className={`relative flex h-[340px] w-[340px] touch-none select-none items-center justify-center sm:h-[440px] sm:w-[440px] ${
          disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        }`}
        role="button"
        aria-label="Rub the magic lamp"
      >
        {/* Spinning light rays */}
        <div
          className="animate-ray-spin pointer-events-none absolute h-[120%] w-[120%] rounded-full opacity-60"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, oklch(0.85 0.16 85 / 0.18) 20deg, transparent 40deg, transparent 180deg, oklch(0.85 0.16 85 / 0.14) 200deg, transparent 220deg)",
            filter: "blur(6px)",
          }}
          aria-hidden="true"
        />
        {/* Radial glow */}
        <div
          className="pointer-events-none absolute h-[70%] w-[70%] rounded-full transition-all duration-200"
          style={{
            background:
              "radial-gradient(circle, oklch(0.9 0.16 88 / 0.9), oklch(0.82 0.15 85 / 0.35) 45%, transparent 70%)",
            opacity: glow,
            transform: `scale(${0.9 + glow * 0.4})`,
            filter: "blur(10px)",
          }}
          aria-hidden="true"
        />

        {/* Smoke burst */}
        {bursting && (
          <div className="pointer-events-none absolute bottom-1/2 left-1/2 -translate-x-1/2" aria-hidden="true">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="absolute rounded-full bg-gold/50"
                style={{
                  left: (Math.random() - 0.5) * 120,
                  width: 40 + Math.random() * 60,
                  height: 40 + Math.random() * 60,
                  filter: "blur(14px)",
                  animation: `smoke-rise ${1.2 + Math.random() * 0.8}s ease-out ${Math.random() * 0.3}s forwards`,
                }}
              />
            ))}
          </div>
        )}

        {/* Lamp */}
        <img
          src={lampImage}
          alt="Golden magic lamp"
          width={1024}
          height={768}
          draggable={false}
          className={`relative z-10 w-[88%] drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] ${
            disabled ? "animate-lamp-idle" : bursting ? "animate-lamp-shake" : rubbing ? "" : "animate-lamp-idle"
          }`}
          style={{
            filter: `drop-shadow(0 0 ${8 + glow * 40}px oklch(0.88 0.16 85 / ${glow}))`,
          }}
        />

        {/* Sparkles */}
        {sparkles.map((s) => (
          <span
            key={s.id}
            className="pointer-events-none absolute z-20 rounded-full bg-gold-bright"
            style={{
              left: s.x,
              top: s.y,
              width: s.size,
              height: s.size,
              boxShadow: "0 0 8px 2px oklch(0.9 0.16 88 / 0.8)",
              animation: "sparkle-fly 0.7s ease-out forwards",
              // @ts-expect-error custom props for keyframe
              "--tx": `${s.tx}px`,
              "--ty": `${s.ty}px`,
            }}
          />
        ))}
      </div>


    </div>
  );
}
