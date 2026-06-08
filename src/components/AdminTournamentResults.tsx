"use client";

import { useState, useTransition } from "react";
import type { Team, TournamentResults } from "@/lib/db/types";
import { saveTournamentResults } from "@/app/(app)/admin/actions";
import {
  COMMON_GOLDEN_GLOVES,
  COMMON_TOP_SCORERS,
  COMMON_YOUNG_PLAYERS,
} from "@/lib/players";

type Props = {
  teams: Team[];
  initial: TournamentResults | null;
};

export function AdminTournamentResults({ teams, initial }: Props) {
  const [topScorer, setTopScorer] = useState(initial?.top_scorer ?? "");
  const [goldenBall, setGoldenBall] = useState(initial?.golden_ball ?? "");
  const [goldenGlove, setGoldenGlove] = useState(initial?.golden_glove ?? "");
  const [youngPlayer, setYoungPlayer] = useState(initial?.young_player ?? "");
  const [revelationTeam, setRevelationTeam] = useState(initial?.revelation_team ?? "");
  const [finalized, setFinalized] = useState(initial?.is_finalized ?? false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSave() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await saveTournamentResults({
        top_scorer: topScorer.trim() || null,
        golden_ball: goldenBall.trim() || null,
        golden_glove: goldenGlove.trim() || null,
        young_player: youngPlayer.trim() || null,
        revelation_team: revelationTeam || null,
        is_finalized: finalized,
      });
      if (res?.error) setError(res.error);
      else setMessage("Premios guardados.");
    });
  }

  return (
    <section className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
      <header>
        <h2 className="text-xl font-bold">Premios oficiales del Mundial</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Llena cuando FIFA publique los premios al final del torneo. Decide tú el
          equipo revelación.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        <PlayerCombobox
          label="Goleador del Mundial"
          value={topScorer}
          onChange={setTopScorer}
          options={COMMON_TOP_SCORERS}
          listId="admin-top-scorers"
        />
        <PlayerCombobox
          label="Balón de Oro"
          value={goldenBall}
          onChange={setGoldenBall}
          options={COMMON_TOP_SCORERS}
          listId="admin-golden-ball"
        />
        <PlayerCombobox
          label="Guante de Oro"
          value={goldenGlove}
          onChange={setGoldenGlove}
          options={COMMON_GOLDEN_GLOVES}
          listId="admin-golden-glove"
        />
        <PlayerCombobox
          label="Mejor jugador joven"
          value={youngPlayer}
          onChange={setYoungPlayer}
          options={COMMON_YOUNG_PLAYERS}
          listId="admin-young-player"
        />
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1.5">
            Equipo revelación
          </label>
          <select
            value={revelationTeam}
            onChange={(e) => setRevelationTeam(e.target.value)}
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">— Elegir —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.flag_emoji ?? ""} {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={finalized}
          onChange={(e) => setFinalized(e.target.checked)}
        />
        <span>
          <strong>Finalizar</strong> los premios (los puntos finales se cuentan
          contra estos valores)
        </span>
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {message && <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="text-sm rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar premios"}
        </button>
      </div>
    </section>
  );
}

function PlayerCombobox({
  label,
  value,
  onChange,
  options,
  listId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  listId: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Selecciona o escribe"
        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </div>
  );
}
