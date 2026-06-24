/**
 * Card de desglose de puntos de la PREDICCIÓN GENERAL (bracket).
 * Server-safe — recibe el resultado ya calculado por scoreBracket().
 * Reutiliza el estilo del desglose por partido de mi-resumen.
 */
import type { MatchScore } from "@/lib/scoring";

export function BracketScoreBreakdown({
  score,
  title = "Puntos de tu predicción general",
  hint,
}: {
  score: MatchScore;
  title?: string;
  hint?: string;
}) {
  const fmt = (n: number) => n.toString().replace(/\.0$/, "");
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <span className="inline-flex items-center rounded-full px-3 py-0.5 font-mono font-bold text-sm bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
          {fmt(score.total)} pts
        </span>
      </div>
      {hint && (
        <p className="px-4 sm:px-5 pt-3 text-xs text-zinc-500">{hint}</p>
      )}
      <ul className="px-4 sm:px-5 py-3 text-sm divide-y divide-zinc-100 dark:divide-zinc-800">
        {score.lines.map((l) => {
          const colorClass = l.correct
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-zinc-500 dark:text-zinc-500";
          const hasItems = !!l.items && l.items.length > 0;
          const rowInner = (
            <>
              <span className="flex items-center gap-1.5 flex-1 min-w-0">
                <span aria-hidden>{l.correct ? "✓" : "·"}</span>
                <span className="truncate">{l.label}</span>
                {l.detail && (
                  <span className="text-zinc-400 dark:text-zinc-500 ml-1 truncate">
                    ({l.detail})
                  </span>
                )}
                {hasItems && (
                  <span
                    aria-hidden
                    className="text-zinc-400 group-open/line:rotate-180 transition-transform shrink-0"
                  >
                    ▾
                  </span>
                )}
              </span>
              <span className="font-mono shrink-0">
                {l.points > 0 ? `+${fmt(l.points)}` : "0"}
              </span>
            </>
          );

          if (!hasItems) {
            return (
              <li
                key={l.label}
                className={`flex items-center justify-between gap-3 py-1.5 ${colorClass}`}
              >
                {rowInner}
              </li>
            );
          }

          return (
            <li key={l.label} className="py-1.5">
              <details className="group/line">
                <summary
                  className={`flex items-center justify-between gap-3 cursor-pointer list-none ${colorClass}`}
                >
                  {rowInner}
                </summary>
                <ul className="mt-1.5 ml-6 rounded-lg border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                  {l.items!.map((it, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300"
                    >
                      <span className="truncate">{it.label}</span>
                      <span className="font-mono shrink-0 text-emerald-700 dark:text-emerald-400">
                        +{fmt(it.points)}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
