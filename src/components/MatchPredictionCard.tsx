"use client";

import { useState, useTransition } from "react";
import type { Match, MatchPrediction, Team } from "@/lib/db/types";
import { savePrediction } from "@/app/(app)/predicciones/partidos/actions";

type Props = {
  match: Match;
  home: Team;
  away: Team;
  teams: Team[];
  prediction: MatchPrediction | null;
  cutoffMin: number;
};

export function MatchPredictionCard({ match, home, away, prediction }: Props) {
  const [homeScore, setHomeScore] = useState<string>(
    prediction?.home_score_90?.toString() ?? "",
  );
  const [awayScore, setAwayScore] = useState<string>(
    prediction?.away_score_90?.toString() ?? "",
  );
  const [koWinner, setKoWinner] = useState<string>(
    prediction?.ko_winner_team_id ?? "",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hs = parseInt(homeScore, 10);
  const as = parseInt(awayScore, 10);
  const validScores = Number.isFinite(hs) && Number.isFinite(as) && hs >= 0 && as >= 0;
  const isDraw90 = validScores && hs === as;
  const needsKOWinner = match.is_knockout && isDraw90;
  const diff = validScores ? Math.abs(hs - as) : 0;
  const predictsBlowout = validScores && diff >= 3;
  const blowoutTeam = predictsBlowout
    ? hs > as
      ? home
      : away
    : null;

  function onSave() {
    setError(null);
    setMessage(null);
    if (!validScores) {
      setError("Llena ambos marcadores con números válidos.");
      return;
    }
    if (needsKOWinner && !koWinner) {
      setError("Como predijiste empate, debes elegir quién gana en alargue/penales.");
      return;
    }
    startTransition(async () => {
      const res = await savePrediction({
        match_id: match.id,
        home_score_90: hs,
        away_score_90: as,
        ko_winner_team_id: needsKOWinner ? koWinner : null,
      });
      if (res?.error) setError(res.error);
      else setMessage("Predicción guardada.");
    });
  }

  return (
    <div className="space-y-4">
      {/* Marcador 90 min */}
      <div>
        <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wide font-semibold">
          Marcador a 90 minutos
        </p>
        <div className="flex items-center gap-3 justify-center">
          <div className="flex flex-col items-center gap-1 w-32">
            <span className="text-3xl" aria-hidden>
              {home.flag_emoji ?? "🏳️"}
            </span>
            <span className="text-sm font-medium text-center">{home.name}</span>
            <input
              type="number"
              min={0}
              max={20}
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              className="w-20 text-center text-2xl font-mono font-bold rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <span className="text-2xl text-zinc-400">–</span>
          <div className="flex flex-col items-center gap-1 w-32">
            <span className="text-3xl" aria-hidden>
              {away.flag_emoji ?? "🏳️"}
            </span>
            <span className="text-sm font-medium text-center">{away.name}</span>
            <input
              type="number"
              min={0}
              max={20}
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              className="w-20 text-center text-2xl font-mono font-bold rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        {predictsBlowout && blowoutTeam && (
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-2 text-center">
            Predices goleada de {blowoutTeam.flag_emoji} {blowoutTeam.name}{" "}
            ({diff} goles de diferencia) · +1 pt si aciertas
          </p>
        )}
      </div>

      {/* KO: ganador en alargue/penales (sólo si empate predicho) */}
      {needsKOWinner && (
        <div>
          <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wide font-semibold">
            Empate a 90 min: ¿quién gana en alargue/penales?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <TeamPickButton
              team={home}
              selected={koWinner === home.id}
              onClick={() => setKoWinner(home.id)}
            />
            <TeamPickButton
              team={away}
              selected={koWinner === away.id}
              onClick={() => setKoWinner(away.id)}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {message && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 text-sm"
        >
          {pending ? "Guardando…" : prediction ? "Actualizar" : "Guardar predicción"}
        </button>
      </div>
    </div>
  );
}

function TeamPickButton({
  team,
  selected,
  onClick,
}: {
  team: Team;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
        selected
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
          : "border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
      }`}
    >
      <span aria-hidden>{team.flag_emoji ?? "🏳️"}</span>
      <span>{team.name}</span>
    </button>
  );
}
