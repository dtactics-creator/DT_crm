import { useEffect, useMemo, useState } from "react";

type Star = { top: string; left: string; size: number; delay: string; dur: string };

function useStars(count: number): Star[] {
  return useMemo(
    () =>
      Array.from({ length: count }, () => ({
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        size: Math.random() * 2.5 + 1,
        delay: `${Math.random() * 3}s`,
        dur: `${2 + Math.random() * 3}s`,
      })),
    [count],
  );
}

export function StarField() {
  const [mounted, setMounted] = useState(false);
  const stars = useStars(90);
  const dust = useStars(18);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="pointer-events-none absolute inset-0" aria-hidden="true" />;


  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {stars.map((s, i) => (
        <span
          key={`star-${i}`}
          className="animate-twinkle absolute rounded-full bg-gold-bright"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
            animationDuration: s.dur,
            boxShadow: "0 0 6px currentColor",
          }}
        />
      ))}
      {dust.map((d, i) => (
        <span
          key={`dust-${i}`}
          className="animate-float-slow absolute rounded-full bg-gold/40 blur-[1px]"
          style={{
            top: d.top,
            left: d.left,
            width: d.size * 3,
            height: d.size * 3,
            animationDelay: d.delay,
            animationDuration: `${6 + Math.random() * 6}s`,
          }}
        />
      ))}
    </div>
  );
}
