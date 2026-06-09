import type {
  Match,
  MatchPrediction,
  MatchResult,
  Settings,
  Team,
} from "@/lib/db/types";
import { dayKey, formatMatchDate, formatMatchTime } from "@/lib/format";
import { TeamLabel } from "@/components/TeamLabel";
import { StageBadge } from "@/components/StageBadge";
import { MatchPredictionCard } from "@/components/MatchPredictionCard";
import { maxPointsPerMatch, scoreMatch } from "@/lib/scoring";

type Props = {
  matches: Match[];
  teamsById: Map<string, Team>;
  predictionsByMatch: Map<number, MatchPrediction>;
  resultsByMatch: Map<number, MatchResult>;
  settings: Settings | null;
  readOnly: boolean;
  ownerLabel: string;
};

export function PredictionsByDay({
  matches,
  teamsById,
  predictionsByMatch,
  resultsByMatch,
  settings,
  readOnly,
  ownerLabel,
}: Props) {
  if (matches.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No hay partidos cargados todavía.</p>
    );
  }

  // Agrupar por día (en zona horaria local del servidor; el cliente la re-renderiza si difiere)
  const days = new Map<string, Match[]>();
  for (const m of matches) {
    const k = dayKey(m.kickoff_at);
    if (!days.has(k)) days.set(k, []);
    days.get(k)!.push(m);
  }

  const cutoffMin = settings?.match_prediction_cutoff_minutes ?? 10;
  const now = Date.now();
  const teamsList = Array.from(teamsById.values());

  // Encontrar el primer día con partidos sin cerrar para auto-expandir
  let openDayKey: string | null = null;
  for (const [k, ms] of days) {
    if (ms.some((m) => new Date(m.kickoff_at).getTime() > now - cutoffMin * 60_000)) {
      openDayKey = k;
      break;
    }
  }

  return (
    <div className="space-y-3">
      {Array.from(days.entries()).map(([k, ms]) => {
        const first = ms[0];
        const open = k === openDayKey;
        const visible = ms.filter((m) => isVisibleForUser(m, readOnly, predictionsByMatch, cutoffMin, now));
        if (visible.length === 0) return null;
        return (
          <details
            key={k}
            open={open}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
          >
            <summary className="px-5 py-3 cursor-pointer flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
              <div className="flex items-center gap-3">
                <span className="font-semibold capitalize">
                  {formatMatchDate(first.kickoff_at)}
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
                    teamsList={teamsList}
                    prediction={predictionsByMatch.get(m.id) ?? null}
                    result={resultsByMatch.get(m.id) ?? null}
                    cutoffMin={cutoffMin}
                    readOnly={readOnly}
                    ownerLabel={ownerLabel}
                  />
                </li>
              ))}
            </ul>
          </details>
        );
      })}
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
  if (!readOnly) return true; // mis-predicciones: ver todos
  // En vista de otro jugador: sólo partidos cerrados o donde el otro tenga predicción guardada visible
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
}: {
  match: Match;
  teamsById: Map<string, Team>;
  teamsList: Team[];
  prediction: MatchPrediction | null;
  result: MatchResult | null;
  cutoffMin: number;
  readOnly: boolean;
  ownerLabel: string;
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
            {formatMatchTime(match.kickoff_at)}
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
          <span className="text-zinc-400 group-open:rotate-180 transition-transform">▾</span>
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
              Hasta <strong className="text-emerald-700 dark:text-emerald-400">
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
          </ul>
        </details>
      )}
    </div>
  );
}
