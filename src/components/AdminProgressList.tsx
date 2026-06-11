type ProgressRow = {
  id: string;
  display_name: string;
  email: string;
  is_admin: boolean;
  groups_completed: number;
  groups_incomplete_codes: string[];
  r32_picks: number;
  r16_picks: number;
  qf_picks: number;
  sf_picks: number;
  champion_set: boolean;
  top_scorer_set: boolean;
  golden_ball_set: boolean;
  golden_glove_set: boolean;
  young_player_set: boolean;
  revelation_team_set: boolean;
  bracket_started: boolean;
  predictions_count: number;
  available_matches_count: number;
};

export function AdminProgressList({ rows }: { rows: ProgressRow[] }) {
  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-bold">
          👥 Progreso de participantes ({rows.length})
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Qué le falta a cada uno. No ves lo que predijeron, sólo qué ítems les
          faltan.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Aún no hay participantes registrados.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((p) => {
            const missing: string[] = [];
            if (p.groups_incomplete_codes.length > 0) {
              missing.push(`Grupos: ${p.groups_incomplete_codes.join(", ")}`);
            }
            if (p.r32_picks < 16)
              missing.push(`R32 (${p.r32_picks}/16)`);
            if (p.r16_picks < 8) missing.push(`8vos (${p.r16_picks}/8)`);
            if (p.qf_picks < 4) missing.push(`4tos (${p.qf_picks}/4)`);
            if (p.sf_picks < 2) missing.push(`Semis (${p.sf_picks}/2)`);
            if (!p.champion_set) missing.push("Campeón");
            if (!p.top_scorer_set) missing.push("Goleador");
            if (!p.golden_ball_set) missing.push("Balón de Oro");
            if (!p.golden_glove_set) missing.push("Guante de Oro");
            if (!p.young_player_set) missing.push("Mejor jugador joven");
            if (!p.revelation_team_set) missing.push("Equipo revelación");

            const total = p.available_matches_count || 72;
            const matchesPending = total - p.predictions_count;
            const matchPct =
              total > 0 ? Math.round((p.predictions_count / total) * 100) : 0;

            const bracketComplete = missing.length === 0;
            const everythingDone =
              bracketComplete && p.predictions_count === total;

            return (
              <li
                key={p.id}
                className={`rounded-xl border p-4 bg-white dark:bg-zinc-900 ${
                  everythingDone
                    ? "border-emerald-300 dark:border-emerald-800"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                  <div>
                    <span className="font-semibold">{p.display_name}</span>
                    {p.is_admin && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                        admin
                      </span>
                    )}
                    <p className="text-xs text-zinc-500">{p.email}</p>
                  </div>
                  {everythingDone && (
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      ✓ Al día
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500 font-semibold mb-1">
                      Predicción general
                    </p>
                    {bracketComplete ? (
                      <p className="text-emerald-700 dark:text-emerald-400">
                        ✓ completa
                      </p>
                    ) : (
                      <p className="text-amber-700 dark:text-amber-400">
                        Falta: {missing.join(" · ")}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500 font-semibold mb-1">
                      Predicciones por partido
                    </p>
                    <p
                      className={
                        matchesPending === 0
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-zinc-700 dark:text-zinc-300"
                      }
                    >
                      {p.predictions_count} / {total} ({matchPct}%)
                      {matchesPending > 0 && (
                        <span className="text-amber-700 dark:text-amber-400">
                          {" "}
                          · {matchesPending} pendiente
                          {matchesPending === 1 ? "" : "s"}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
