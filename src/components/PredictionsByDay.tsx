"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Match,
  MatchPrediction,
  MatchResult,
  Settings,
  Team,
} from "@/lib/db/types";
import { TeamLabel } from "@/components/TeamLabel";
import { StageBadge } from "@/components/StageBadge";
import { MatchPredictionCard } from "@/components/MatchPredictionCard";
import { LocalTime } from "@/components/LocalDateTime";
import { maxPointsPerMatch, scoreMatch } from "@/lib/scoring";
import type { MatchScore } from "@/lib/scoring";

type Props = {
  matches: Match[];
  teams: Team[];
  predictions: MatchPrediction[];
  results: MatchResult[];
  settings: Settings | null;
  readOnly: boolean;
  ownerLabel: string;
  allPredictions?: MatchPrediction[];
  profiles?: { id: string; display_name: string }[];
};

// Formato de día en TZ del navegador
const DAY_HEADER_FMT = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function localDayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function PredictionsByDay({
  matches,
  teams,
  predictions,
  results,
  settings,
  readOnly,
  ownerLabel,
  allPredictions,
  profiles,
}: Props) {
  // Esperamos a estar en el cliente para agrupar/mostrar con la TZ del navegador.
  // Mientras tanto mostramos un placeholder. Evita mismatch SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Filtro de organización: por defecto mostramos lo que viene.
  const [filter, setFilter] = useState<"upcoming" | "played" | "all">(
    "upcoming",
  );
  const dayRefs = useRef<Map<string, HTMLDetailsElement>>(new Map());

  const teamsById = useMemo(
    () => new Map(teams.map((t) => [t.id, t])),
    [teams],
  );
  const predictionsByMatch = useMemo(
    () => new Map(predictions.map((p) => [p.match_id, p])),
    [predictions],
  );
  const resultsByMatch = useMemo(
    () => new Map(results.map((r) => [r.match_id, r])),
    [results],
  );
  const allPredsByMatch = useMemo(() => {
    const map = new Map<number, MatchPrediction[]>();
    for (const p of allPredictions ?? []) {
      if (!map.has(p.match_id)) map.set(p.match_id, []);
      map.get(p.match_id)!.push(p);
    }
    return map;
  }, [allPredictions]);
  const profileNameById = useMemo(
    () => new Map((profiles ?? []).map((p) => [p.id, p.display_name])),
    [profiles],
  );

  const cutoffMin = settings?.match_prediction_cutoff_minutes ?? 10;

  // Agrupar por día en TZ del browser
  const days = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of matches) {
      const k = localDayKey(m.kickoff_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    }
    return Array.from(map.entries());
  }, [matches]);

  if (!mounted) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No hay partidos cargados todavía.</p>
    );
  }

  const now = Date.now();
  // Próximo partido (el primero cuyo kickoff aún no pasa) → día a auto-abrir.
  const nextMatch = matches.find(
    (m) => new Date(m.kickoff_at).getTime() > now,
  );
  const nextDayKey = nextMatch ? localDayKey(nextMatch.kickoff_at) : null;
  // Fallback: primer día con partidos aún no cerrados.
  let openDayKey: string | null = nextDayKey;
  if (!openDayKey) {
    for (const [k, ms] of days) {
      if (
        ms.some(
          (m) => new Date(m.kickoff_at).getTime() > now - cutoffMin * 60_000,
        )
      ) {
        openDayKey = k;
        break;
      }
    }
  }

  const dayIsUpcoming = (ms: Match[]) =>
    ms.some((m) => new Date(m.kickoff_at).getTime() > now);
  const visibleDays = days.filter(([, ms]) => {
    if (filter === "all") return true;
    const up = dayIsUpcoming(ms);
    return filter === "upcoming" ? up : !up;
  });

  const goToNext = () => {
    if (!nextDayKey) return;
    setFilter("upcoming");
    // Esperamos al re-render del filtro antes de hacer scroll.
    setTimeout(() => {
      const el = dayRefs.current.get(nextDayKey);
      if (el) {
        el.open = true;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 0);
  };

  const TABS: { key: "upcoming" | "played" | "all"; label: string }[] = [
    { key: "upcoming", label: "Próximos" },
    { key: "played", label: "Jugados" },
    { key: "all", label: "Todos" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5 text-sm">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={`px-3 py-1 rounded-md transition-colors ${
                filter === t.key
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {nextDayKey && (
          <button
            type="button"
            onClick={goToNext}
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            Saltar al próximo partido →
          </button>
        )}
      </div>

      {visibleDays.length === 0 ? (
        <p className="text-sm text-zinc-500 px-1 py-4">
          {filter === "upcoming"
            ? "No hay partidos próximos."
            : filter === "played"
              ? "Todavía no hay partidos jugados."
              : "No hay partidos."}
        </p>
      ) : (
        visibleDays.map(([k, ms]) => {
        const first = ms[0];
        const open = k === openDayKey;
        const visible = ms.filter((m) =>
          isVisibleForUser(m, readOnly, predictionsByMatch, cutoffMin, now),
        );
        if (visible.length === 0) return null;
        return (
          <details
            key={k}
            ref={(el) => {
              if (el) dayRefs.current.set(k, el);
              else dayRefs.current.delete(k);
            }}
            open={open}
            className="scroll-mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
          >
            <summary className="px-5 py-3 cursor-pointer flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
              <div className="flex items-center gap-3">
                <span className="font-semibold capitalize">
                  {DAY_HEADER_FMT.format(new Date(first.kickoff_at))}
                </span>
                <span className="text-xs text-zinc-500">
                  {visible.length} partido{visible.length === 1 ? "" : "s"}
                </span>
              </div>
              <span className="text-xs text-zinc-400">
                {ms.filter((m) => resultsByMatch.has(m.id)).length} resuelto(s)
              </span>
            </summary>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {visible.map((m) => (
                <li key={m.id} className="px-5 py-4">
                  <MatchEntry
                    match={m}
                    teamsById={teamsById}
                    teamsList={teams}
                    prediction={predictionsByMatch.get(m.id) ?? null}
                    result={resultsByMatch.get(m.id) ?? null}
                    cutoffMin={cutoffMin}
                    readOnly={readOnly}
                    ownerLabel={ownerLabel}
                    allPreds={allPredsByMatch.get(m.id) ?? []}
                    profileNameById={profileNameById}
                  />
                </li>
              ))}
            </ul>
          </details>
        );
        })
      )}
    </div>
  );
}

function isVisibleForUser(
  match: Match,
  readOnly: boolean,
  predictionsByMatch: Map<number, MatchPrediction>,
  cutoffMin: number,
  now: number,
) {
  if (!readOnly) return true;
  const locked = new Date(match.kickoff_at).getTime() - cutoffMin * 60_000 <= now;
  return locked && predictionsByMatch.has(match.id);
}

function MatchEntry({
  match,
  teamsById,
  teamsList,
  prediction,
  result,
  cutoffMin,
  readOnly,
  ownerLabel,
  allPreds,
  profileNameById,
}: {
  match: Match;
  teamsById: Map<string, Team>;
  teamsList: Team[];
  prediction: MatchPrediction | null;
  result: MatchResult | null;
  cutoffMin: number;
  readOnly: boolean;
  ownerLabel: string;
  allPreds: MatchPrediction[];
  profileNameById: Map<string, string>;
}) {
  const home = match.home_team_id ? teamsById.get(match.home_team_id) ?? null : null;
  const away = match.away_team_id ? teamsById.get(match.away_team_id) ?? null : null;
  const locked = new Date(match.kickoff_at).getTime() - cutoffMin * 60_000 <= Date.now();
  const teamsKnown = !!home && !!away;
  const canEdit = !readOnly && !locked && teamsKnown;

  return (
    <details className="group">
      <summary className="cursor-pointer flex items-center justify-between gap-3 list-none">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <StageBadge stage={match.stage} groupCode={match.group_code} />
          <span className="text-xs text-zinc-500 whitespace-nowrap">
            <LocalTime iso={match.kickoff_at} />
          </span>
          <div className="flex items-center gap-2 truncate">
            <TeamLabel team={home} placeholder={match.home_placeholder} size="sm" />
            <span className="text-zinc-400">vs</span>
            <TeamLabel team={away} placeholder={match.away_placeholder} size="sm" />
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {result ? (
            <span className="font-mono font-semibold">
              {result.home_score_90}–{result.away_score_90}
              {result.went_to_penalties && (
                <span className="text-[10px] text-zinc-500 ml-1">pen.</span>
              )}
            </span>
          ) : locked ? (
            <span className="text-xs text-zinc-400">cerrado</span>
          ) : null}
          {prediction ? (
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              {prediction.home_score_90}–{prediction.away_score_90}
            </span>
          ) : !readOnly && !locked && teamsKnown ? (
            <span className="text-xs text-amber-600">sin predicción</span>
          ) : null}
          <span className="text-emerald-500/70 group-open:text-emerald-500 group-open:rotate-180 transition-transform">▾</span>
        </div>
      </summary>

      <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
        {!teamsKnown ? (
          <p className="text-sm text-zinc-500">
            Los equipos de este partido aún no están definidos. Vuelve cuando avance el torneo.
          </p>
        ) : canEdit ? (
          <>
            <p className="text-xs text-zinc-500 mb-2">
              Hasta{" "}
              <strong className="text-emerald-700 dark:text-emerald-400">
                +{maxPointsPerMatch(match.stage).toString().replace(/\.0$/, "")} pts
              </strong>{" "}
              si aciertas todo en este partido.
            </p>
            <MatchPredictionCard
              match={match}
              home={home!}
              away={away!}
              teams={teamsList}
              prediction={prediction}
              cutoffMin={cutoffMin}
            />
          </>
        ) : (
          <ReadOnlyPrediction
            match={match}
            home={home!}
            away={away!}
            teamsById={teamsById}
            prediction={prediction}
            result={result}
            ownerLabel={ownerLabel}
          />
        )}
        {match.venue && (
          <p className="mt-3 text-xs text-zinc-500">
            {match.venue}
            {match.city ? ` · ${match.city}` : ""}
            {match.country ? `, ${match.country}` : ""}
          </p>
        )}
        {locked && allPreds.length > 0 && (
          <AllPredictionsBlock
            match={match}
            allPreds={allPreds}
            result={result}
            teamsById={teamsById}
            profileNameById={profileNameById}
          />
        )}
      </div>
    </details>
  );
}

function ReadOnlyPrediction({
  match,
  home,
  away,
  teamsById,
  prediction,
  result,
  ownerLabel,
}: {
  match: Match;
  home: Team;
  away: Team;
  teamsById: Map<string, Team>;
  prediction: MatchPrediction | null;
  result: MatchResult | null;
  ownerLabel: string;
}) {
  if (!prediction) {
    return <p className="text-sm text-zinc-500">Sin predicción.</p>;
  }
  const diff = Math.abs(prediction.home_score_90 - prediction.away_score_90);
  const predictedBlowout = diff >= 3;
  const predBlowoutTeam = predictedBlowout
    ? prediction.home_score_90 > prediction.away_score_90
      ? home
      : away
    : null;
  const koWinner = prediction.ko_winner_team_id
    ? teamsById.get(prediction.ko_winner_team_id)
    : null;
  const isDraw90 = prediction.home_score_90 === prediction.away_score_90;
  const score = result?.is_finalized ? scoreMatch(match, prediction, result) : null;

  return (
    <div className="text-sm space-y-2">
      <p>
        <span className="text-zinc-500">Predicción de {ownerLabel}:</span>{" "}
        <span className="font-mono font-semibold">
          {prediction.home_score_90}–{prediction.away_score_90}
        </span>{" "}
        ({home.name} vs {away.name} a 90 min)
      </p>
      {match.is_knockout && isDraw90 && koWinner && (
        <p className="text-zinc-600 dark:text-zinc-400">
          En alargue/penales: gana <strong>{koWinner.name}</strong>
        </p>
      )}
      {predBlowoutTeam && (
        <p className="text-zinc-600 dark:text-zinc-400">
          Implica goleada de <strong>{predBlowoutTeam.name}</strong> ({diff} de diferencia)
        </p>
      )}
      {result?.is_finalized && (
        <p className="text-xs text-zinc-500 pt-1">
          Resultado oficial:{" "}
          <span className="font-mono">
            {result.home_score_90}–{result.away_score_90}
          </span>
          {result.went_to_extra_time && " (tiempo extra)"}
          {result.went_to_penalties && " · penales"}
          {result.winner_team_id && (result.went_to_extra_time || result.went_to_penalties) && (
            <>
              {" · gana "}
              <strong>{teamsById.get(result.winner_team_id)?.name}</strong>
            </>
          )}
        </p>
      )}
      {score && (
        <details className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 mt-2 overflow-hidden">
          <summary className="cursor-pointer px-3 py-2 flex items-center justify-between text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <span>Puntos en este partido</span>
            <span
              className={`font-mono ${
                score.total > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-500"
              }`}
            >
              {score.total > 0 ? "+" : ""}
              {score.total.toString().replace(/\.0$/, "")} pts
            </span>
          </summary>
          <ScoreLinesList score={score} />
        </details>
      )}
    </div>
  );
}

/** Lista reutilizable con el desglose de puntos de un partido. */
function ScoreLinesList({
  score,
  showTotal = false,
}: {
  score: MatchScore;
  showTotal?: boolean;
}) {
  return (
    <ul className="text-xs divide-y divide-zinc-200 dark:divide-zinc-800 border-t border-zinc-200 dark:border-zinc-800">
      {score.lines.map((l) => (
        <li
          key={l.label}
          className={`flex items-center justify-between gap-3 px-3 py-1.5 ${
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
            {l.points > 0
              ? `+${l.points.toString().replace(/\.0$/, "")}`
              : "0"}
          </span>
        </li>
      ))}
      {showTotal && (
        <li className="flex items-center justify-between gap-3 px-3 py-2 font-semibold bg-zinc-200/60 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
          <span>Total del partido</span>
          <span className="font-mono text-emerald-700 dark:text-emerald-400">
            +{score.total.toString().replace(/\.0$/, "")}
          </span>
        </li>
      )}
    </ul>
  );
}

/**
 * Bloque colapsable con las predicciones de TODOS los participantes para un
 * partido (solo se monta cuando el partido ya está cerrado). Muestra el
 * marcador de cada quien y, si el resultado está finalizado, los puntos que
 * gana — expandible al desglose completo.
 */
function AllPredictionsBlock({
  match,
  allPreds,
  result,
  teamsById,
  profileNameById,
}: {
  match: Match;
  allPreds: MatchPrediction[];
  result: MatchResult | null;
  teamsById: Map<string, Team>;
  profileNameById: Map<string, string>;
}) {
  const finalized = !!result?.is_finalized;
  const rows = allPreds
    .map((p) => ({
      p,
      name: profileNameById.get(p.user_id) ?? "Participante",
      score: finalized ? scoreMatch(match, p, result!) : null,
    }))
    .sort((a, b) => {
      if (a.score && b.score && b.score.total !== a.score.total)
        return b.score.total - a.score.total;
      return a.name.localeCompare(b.name);
    });

  return (
    <details className="group/all mt-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 overflow-hidden">
      <summary className="cursor-pointer px-3 py-2 flex items-center justify-between text-sm font-semibold list-none hover:bg-zinc-100 dark:hover:bg-zinc-800/40">
        <span>👥 Predicciones de todos ({allPreds.length})</span>
        <span className="text-emerald-500/70 group-open/all:text-emerald-500 group-open/all:rotate-180 transition-transform">
          ▾
        </span>
      </summary>
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 border-t border-zinc-200 dark:border-zinc-800">
        {rows.map(({ p, name, score }) => {
          const isDraw = p.home_score_90 === p.away_score_90;
          const koWinner =
            match.is_knockout && isDraw && p.ko_winner_team_id
              ? teamsById.get(p.ko_winner_team_id)
              : null;
          return (
            <li key={p.id}>
              <details className="group/row">
                <summary
                  className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 px-3 py-1.5 text-xs list-none ${
                    score
                      ? "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/40"
                      : "cursor-default"
                  }`}
                >
                  <span className="truncate min-w-0">
                    {name}
                    {koWinner && (
                      <span className="text-zinc-400 ml-1">
                        (gana {koWinner.name})
                      </span>
                    )}
                  </span>
                  <span className="font-mono">
                    {p.home_score_90}–{p.away_score_90}
                  </span>
                  <span className="w-10 text-right">
                    {score ? (
                      <span
                        className={`font-mono font-semibold ${
                          score.total > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-zinc-500"
                        }`}
                      >
                        {score.total > 0 ? "+" : ""}
                        {score.total.toString().replace(/\.0$/, "")}
                      </span>
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-600">—</span>
                    )}
                  </span>
                  <span
                    className={`text-emerald-500/70 transition-transform ${
                      score
                        ? "group-open/row:text-emerald-500 group-open/row:rotate-180"
                        : "invisible"
                    }`}
                    aria-hidden
                  >
                    ▾
                  </span>
                </summary>
                {score && (
                  <div className="px-2 pb-2">
                    <ScoreLinesList score={score} showTotal />
                  </div>
                )}
              </details>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
