"use client";

import { useMemo, useState } from "react";
import type { Match, MatchResult, Team } from "@/lib/db/types";
import { dayKey, formatMatchDate, formatMatchTime } from "@/lib/format";
import { StageBadge } from "@/components/StageBadge";
import { AdminMatchRow } from "@/components/AdminMatchRow";

type Props = {
  matches: Match[];
  results: MatchResult[];
  teams: Team[];
};

export function AdminMatchList({ matches, results, teams }: Props) {
  const teamsById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const resultsByMatch = useMemo(
    () => new Map(results.map((r) => [r.match_id, r])),
    [results],
  );

  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");

  const filtered = useMemo(() => {
    const now = Date.now();
    return matches.filter((m) => {
      const r = resultsByMatch.get(m.id);
      if (filter === "done") return !!r?.is_finalized;
      if (filter === "pending") {
        // Pendientes: ya jugados (kickoff pasó) sin resultado finalizado
        const played = new Date(m.kickoff_at).getTime() < now;
        return played && !r?.is_finalized;
      }
      return true;
    });
  }, [matches, resultsByMatch, filter]);

  const days = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of filtered) {
      const k = dayKey(m.kickoff_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold">Resultados de partidos</h2>
        <div className="inline-flex rounded-md border border-zinc-300 dark:border-zinc-700 overflow-hidden text-sm">
          <FilterBtn active={filter === "pending"} onClick={() => setFilter("pending")}>
            Pendientes
          </FilterBtn>
          <FilterBtn active={filter === "done"} onClick={() => setFilter("done")}>
            Cargados
          </FilterBtn>
          <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>
            Todos
          </FilterBtn>
        </div>
      </div>

      {days.length === 0 ? (
        <p className="text-sm text-zinc-500">No hay partidos en este filtro.</p>
      ) : (
        <div className="space-y-3">
          {days.map(([k, ms]) => (
            <details
              key={k}
              open={filter !== "all" || days.length === 1}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
            >
              <summary className="px-5 py-3 cursor-pointer flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                <span className="font-semibold capitalize">
                  {formatMatchDate(ms[0].kickoff_at)}
                </span>
                <span className="text-xs text-zinc-500">
                  {ms.length} partido{ms.length === 1 ? "" : "s"}
                </span>
              </summary>
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {ms.map((m) => {
                  const home = m.home_team_id ? teamsById.get(m.home_team_id) : null;
                  const away = m.away_team_id ? teamsById.get(m.away_team_id) : null;
                  const r = resultsByMatch.get(m.id) ?? null;
                  const teamsKnown = !!home && !!away;
                  return (
                    <li key={m.id} className="px-5 py-3">
                      <details>
                        <summary className="cursor-pointer flex items-center justify-between gap-3 list-none">
                          <div className="flex items-center gap-3 min-w-0">
                            <StageBadge stage={m.stage} groupCode={m.group_code} />
                            <span className="text-xs text-zinc-500 whitespace-nowrap">
                              {formatMatchTime(m.kickoff_at)}
                            </span>
                            <span className="truncate text-sm">
                              <span className="mr-1">{home?.flag_emoji ?? "·"}</span>
                              {home?.name ?? m.home_placeholder ?? "?"}
                              <span className="text-zinc-400 mx-1.5">vs</span>
                              <span className="mr-1">{away?.flag_emoji ?? "·"}</span>
                              {away?.name ?? m.away_placeholder ?? "?"}
                            </span>
                          </div>
                          <div className="text-sm">
                            {r?.is_finalized ? (
                              <span className="font-mono font-semibold text-emerald-600">
                                {r.home_score_90}–{r.away_score_90}
                                {r.went_to_penalties ? " pen." : r.went_to_extra_time ? " ET" : ""}
                              </span>
                            ) : (
                              <span className="text-xs text-amber-600">pendiente</span>
                            )}
                          </div>
                        </summary>
                        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                          {!teamsKnown ? (
                            <p className="text-sm text-zinc-500">
                              Los equipos aún no están asignados. Carga primero los
                              resultados de la ronda anterior o el sorteo.
                            </p>
                          ) : (
                            <AdminMatchRow
                              match={m}
                              home={home!}
                              away={away!}
                              result={r}
                            />
                          )}
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

function FilterBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium ${
        active
          ? "bg-emerald-600 text-white"
          : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}
