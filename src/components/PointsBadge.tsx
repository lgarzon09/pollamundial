/**
 * Píldora verde "+N" para mostrar los puntos que aporta una selección del
 * bracket. No renderiza nada si no hay puntos (pick incorrecto o sin resultado).
 */
export function PointsBadge({ points }: { points?: number | null }) {
  if (!points || points <= 0) return null;
  const fmt = points.toString().replace(/\.0$/, "");
  return (
    <span className="ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 align-middle">
      +{fmt}
    </span>
  );
}
