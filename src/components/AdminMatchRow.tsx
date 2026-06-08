"use client";

import { useState, useTransition } from "react";
import type { Match, MatchResult, Team } from "@/lib/db/types";
import { saveMatchResult, clearMatchResult } from "@/app/(app)/admin/actions";

type Props = {
  match: Match;
  home: Team;
  away: Team;
  result: MatchResult | null;
};

export function AdminMatchRow({ match, home, away, result }: Props) {
  const [homeScore, setHomeScore] = useState(
    result?.home_score_90?.toString() ?? "",
  );
  const [awayScore, setAwayScore] = useState(
    result?.away_score_90?.toString() ?? "",
  );
  const [extraTime, setExtraTime] = useState(result?.went_to_extra_time ?? false);
  const [penalties, setPenalties] = useState(result?.went_to_penalties ?? false);
  const [winner, setWinner] = useState(result?.winner_team_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hs = parseInt(homeScore, 10);
  const as = parseInt(awayScore, 10);
  const validScores = Number.isFinite(hs) && Number.isFinite(as) && hs >= 0 && as >= 0;
  const isDraw = validScores && hs === as;
  const needsKOWinner = match.is_knockout && isDraw;

  function onSave(finalize: boolean) {
    setError(null);
    setMessage(null);
    if (!validScores) {
      setError("Marcador inválido.");
      return;
    }
    if (needsKOWinner && !winner) {
      setError("Empate a 90 en KO: elige quién gana en alargue/penales.");
      return;
    }
    startTransition(async () => {
      const res = await saveMatchResult({
        match_id: match.id,
        home_score_90: hs,
        away_score_90: as,
        went_to_extra_time: extraTime || penalties,
        went_to_penalties: penalties,
        winner_team_id: needsKOWinner ? winner : null,
        is_finalized: finalize,
      });
      if (res?.error) setError(res.error);
      else setMessage(finalize ? "Resultado finalizado." : "Borrador guardado.");
    });
  }

  function onClear() {
    if (!confirm("¿Borrar este resultado? Quedará pendiente nuevamente.")) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await clearMatchResult(match.id);
      if (res?.error) setError(res.error);
      else setMessage("Resultado borrado.");
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 justify-center">
        <div className="flex flex-col items-center gap-1 w-32">
          <span className="text-2xl" aria-hidden>{home.flag_emoji ?? "🏳️"}</span>
          <span className="text-sm font-medium text-center">{home.name}</span>
          <input
            type="number"
            min={0}
            max={20}
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            className="w-16 text-center text-xl font-mono font-bold rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <span className="text-xl text-zinc-400">–</span>
        <div className="flex flex-col items-center gap-1 w-32">
          <span className="text-2xl" aria-hidden>{away.flag_emoji ?? "🏳️"}</span>
          <span className="text-sm font-medium text-center">{away.name}</span>
          <input
            type="number"
            min={0}
            max={20}
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            className="w-16 text-center text-xl font-mono font-bold rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {match.is_knockout && (
        <div className="space-y-2">
          <div className="flex items-center gap-4 justify-center text-sm">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={extraTime}
                onChange={(e) => {
                  setExtraTime(e.target.checked);
                  if (!e.target.checked) setPenalties(false);
                }}
              />
              <span>Fue a tiempo extra</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={penalties}
                onChange={(e) => {
                  setPenalties(e.target.checked);
                  if (e.target.checked) setExtraTime(true);
                }}
              />
              <span>Se decidió por penales</span>
            </label>
          </div>
          {needsKOWinner && (
            <div>
              <p className="text-xs text-zinc-500 mb-1.5 uppercase tracking-wide font-semibold text-center">
                Ganador en alargue/penales
              </p>
              <div className="grid grid-cols-2 gap-2">
                <WinnerBtn
                  team={home}
                  selected={winner === home.id}
                  onClick={() => setWinner(home.id)}
                />
                <WinnerBtn
                  team={away}
                  selected={winner === away.id}
                  onClick={() => setWinner(away.id)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
      )}
      {message && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400 text-center">
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-2 justify-end pt-2">
        {result && (
          <button
            type="button"
            onClick={onClear}
            disabled={pending}
            className="text-xs rounded-md border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 px-3 py-1.5 disabled:opacity-50"
          >
            Borrar
          </button>
        )}
        <button
          type="button"
          onClick={() => onSave(false)}
          disabled={pending}
          className="text-sm rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5 disabled:opacity-50"
        >
          {pending ? "…" : "Guardar borrador"}
        </button>
        <button
          type="button"
          onClick={() => onSave(true)}
          disabled={pending}
          className="text-sm rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 disabled:opacity-50"
        >
          Finalizar resultado
        </button>
      </div>
    </div>
  );
}

function WinnerBtn({
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
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium ${
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
