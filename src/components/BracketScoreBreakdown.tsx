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
        {score.lines.map((l) => (
          <li
            key={l.label}
            className={`flex items-center justify-between gap-3 py-1.5 ${
              l.correct
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-zinc-500 dark:text-zinc-500"
            }`}
          >
            <span className="flex items-center gap-1.5 flex-1 min-w-0">
              <span aria-hidden>{l.correct ? "✓" : "·"}</span>
              <span className="truncate">{l.label}</span>
              {l.detail && (
                <span className="text-zinc-400 dark:text-zinc-500 ml-1 truncate">
                  ({l.detail})
                </span>
              )}
            </span>
            <span className="font-mono shrink-0">
              {l.points > 0 ? `+${fmt(l.points)}` : "0"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
