/**
 * Muestra los puntos que aporta una selección del bracket: una píldora "+N" con
 * el total y, al lado, la(s) razón(es) detalladas (p. ej. "Posición exacta +3 ·
 * Clasificó a la Ronda de 32 +5"). No renderiza nada si la selección no suma.
 */
import type { PickPoints } from "@/lib/scoring";

const fmt = (n: number) => n.toString().replace(/\.0$/, "");

export function PointsBadge({
  pick,
  showReasons = true,
}: {
  pick?: PickPoints | null;
  showReasons?: boolean;
}) {
  if (!pick || pick.total <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex flex-wrap items-baseline gap-x-1 gap-y-0.5 align-baseline">
      <span className="inline-flex items-center rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
        +{fmt(pick.total)}
      </span>
      {showReasons && pick.reasons.length > 0 && (
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
          {pick.reasons.map((r) => `${r.label} +${fmt(r.points)}`).join(" · ")}
        </span>
      )}
    </span>
  );
}
