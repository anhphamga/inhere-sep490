import { useMemo } from "react";
import "./SakuraFall.css";

export default function SakuraFall({ count = 24 }) {
  const petals = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 12,
        duration: 9 + Math.random() * 8,
        size: 8 + Math.random() * 12,
        drift: -20 + Math.random() * 40,
      })),
    [count]
  );

  return (
    <div className="sakura-layer" aria-hidden="true">
      {petals.map((petal) => (
        <span
          key={petal.id}
          className="sakura-petal"
          style={{
            left: `${petal.left}%`,
            width: `${petal.size}px`,
            height: `${petal.size * 0.8}px`,
            animationDelay: `${petal.delay}s`,
            animationDuration: `${petal.duration}s`,
            ["--drift"]: `${petal.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
