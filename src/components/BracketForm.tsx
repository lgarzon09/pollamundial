"use client";

import { useMemo, useState, useTransition } from "react";
import { saveBracket } from "@/app/(app)/predicciones/general/actions";
import type {
  BracketPrediction,
  Match,
  MatchStage,
  Team,
} from "@/lib/db/types";
import {
  COMMON_GOLDEN_GLOVES,
  COMMON_TOP_SCORERS,
  COMMON_YOUNG_PLAYERS,
} from "@/lib/players";

type Props = {
  teams: Team[];
  koMatches: Match[]; // todos los partidos no-grupo (R32..Final + tercer puesto)
  initial: BracketPrediction | null;
  readOnly: boolean;
  tournamentStartIso: string | null;
};

const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

export function BracketForm({
  teams,
  koMatches,
  initial,
  readOnly,
  tournamentStartIso,
}: Props) {
  const teamsById = useMemo(
    () => new Map(teams.map((t) => [t.id, t])),
    [teams],
  );

  const teamsByGroup = useMemo(() => {
    const map = new Map<string, Team[]>();
    for (const g of GROUPS) map.set(g, []);
    for (const t of teams) {
      if (t.group_code) map.get(t.group_code)!.push(t);
    }
    return map;
  }, [teams]);

  const matchesById = useMemo(
    () => new Map(koMatches.map((m) => [m.id, m])),
    [koMatches],
  );
  const byStage = useMemo(() => {
    const m = new Map<MatchStage, Match[]>();
    for (const k of koMatches) {
      if (!m.has(k.stage)) m.set(k.stage, []);
      m.get(k.stage)!.push(k);
    }
    return m;
  }, [koMatches]);

  // ---------- estado ----------
  const [groupPositions, setGroupPositions] = useState<Record<string, string[]>>(
    () => {
      const init: Record<string, string[]> = {};
      for (const g of GROUPS) {
        init[g] = initial?.group_positions?.[g] ?? ["", "", "", ""];
      }
      return init;
    },
  );
  const [r32ThirdPlace, setR32ThirdPlace] = useState<Record<string, string>>(
    initial?.r32_third_place_assignments ?? {},
  );
  const [r32Winners, setR32Winners] = useState<Record<string, string>>(
    initial?.r32_winners ?? {},
  );
  const [r16Winners, setR16Winners] = useState<Record<string, string>>(
    initial?.r16_winners ?? {},
  );
  const [qfWinners, setQfWinners] = useState<Record<string, string>>(
    initial?.qf_winners ?? {},
  );
  const [sfWinners, setSfWinners] = useState<Record<string, string>>(
    initial?.sf_winners ?? {},
  );
  const [champion, setChampion] = useState<string>(initial?.champion ?? "");
  const [topScorer, setTopScorer] = useState<string>(initial?.top_scorer ?? "");
  const [goldenBall, setGoldenBall] = useState<string>(initial?.golden_ball ?? "");
  const [goldenGlove, setGoldenGlove] = useState<string>(initial?.golden_glove ?? "");
  const [youngPlayer, setYoungPlayer] = useState<string>(initial?.young_player ?? "");
  const [revelationTeam, setRevelationTeam] = useState<string>(
    initial?.revelation_team ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setPosition(group: string, posIdx: number, teamId: string) {
    setGroupPositions((prev) => {
      const next = { ...prev, [group]: [...prev[group]] };
      const existingIdx = next[group].indexOf(teamId);
      if (teamId && existingIdx !== -1 && existingIdx !== posIdx) {
        next[group][existingIdx] = next[group][posIdx] ?? "";
      }
      next[group][posIdx] = teamId;
      return next;
    });
  }

  // ---------- helpers de slot ----------
  // Devuelve el equipo CONCRETO asignado a un slot (uno solo) o null.
  // Para slots "3° X/Y/Z/W/V", el equipo viene de r32ThirdPlace[matchId].
  function resolveSlotTeam(
    matchId: number,
    placeholder: string | null | undefined,
  ): string | null {
    if (!placeholder) return null;
    const groupMatch = placeholder.match(/^([1-4])°\s+Grupo\s+([A-L])$/);
    if (groupMatch) {
      const pos = parseInt(groupMatch[1], 10) - 1;
      const g = groupMatch[2];
      return groupPositions[g]?.[pos] || null;
    }
    if (/^3°\s+([A-L/]+)$/.test(placeholder)) {
      return r32ThirdPlace[matchId.toString()] || null;
    }
    const winnerMatch = placeholder.match(/^Ganador M(\d+)$/);
    if (winnerMatch) {
      const sid = winnerMatch[1];
      const src = matchesById.get(parseInt(sid, 10));
      if (!src) return null;
      return src.stage === "r32"
        ? r32Winners[sid] || null
        : src.stage === "r16"
          ? r16Winners[sid] || null
          : src.stage === "qf"
            ? qfWinners[sid] || null
            : src.stage === "sf"
              ? sfWinners[sid] || null
              : null;
    }
    return null;
  }

  // Pool de candidatos para un slot multi-candidato ("3° X/Y/Z/W/V")
  function poolForThirdPlace(placeholder: string | null | undefined): string[] {
    if (!placeholder) return [];
    const m = placeholder.match(/^3°\s+([A-L/]+)$/);
    if (!m) return [];
    return m[1]
      .split("/")
      .map((g) => groupPositions[g]?.[2])
      .filter((x): x is string => !!x);
  }

  function isThirdPlaceSlot(placeholder: string | null | undefined) {
    return !!placeholder && /^3°\s+([A-L/]+)$/.test(placeholder);
  }

  function setWinner(stage: MatchStage, matchId: number, teamId: string) {
    const key = matchId.toString();
    if (stage === "r32") setR32Winners((p) => ({ ...p, [key]: teamId }));
    else if (stage === "r16") setR16Winners((p) => ({ ...p, [key]: teamId }));
    else if (stage === "qf") setQfWinners((p) => ({ ...p, [key]: teamId }));
    else if (stage === "sf") setSfWinners((p) => ({ ...p, [key]: teamId }));
  }
  function getWinner(stage: MatchStage, matchId: number): string {
    const key = matchId.toString();
    if (stage === "r32") return r32Winners[key] ?? "";
    if (stage === "r16") return r16Winners[key] ?? "";
    if (stage === "qf") return qfWinners[key] ?? "";
    if (stage === "sf") return sfWinners[key] ?? "";
    return "";
  }

  const completedGroups = GROUPS.filter((g) => {
    const pos = groupPositions[g] ?? [];
    return pos.filter(Boolean).length === 4 && new Set(pos).size === 4;
  }).length;

  // Finalistas derivados (los dos ganadores de SF)
  const finalMatch = (byStage.get("final") ?? [])[0];
  const finalists = useMemo(() => {
    if (!finalMatch) return [];
    const ids = [
      resolveSlotTeam(finalMatch.id, finalMatch.home_placeholder),
      resolveSlotTeam(finalMatch.id, finalMatch.away_placeholder),
    ].filter((x): x is string => !!x);
    return ids.map((id) => teamsById.get(id)).filter((t): t is Team => !!t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalMatch, groupPositions, r32ThirdPlace, r32Winners, r16Winners, qfWinners, sfWinners]);

  function handleSave() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await saveBracket({
        group_positions: groupPositions,
        r32_third_place_assignments: r32ThirdPlace,
        r32_winners: r32Winners,
        r16_winners: r16Winners,
        qf_winners: qfWinners,
        sf_winners: sfWinners,
        finalists: finalists.map((t) => t.id),
        champion: champion || null,
        top_scorer: topScorer.trim() || null,
        golden_ball: goldenBall.trim() || null,
        golden_glove: goldenGlove.trim() || null,
        young_player: youngPlayer.trim() || null,
        revelation_team: revelationTeam || null,
      });
      if (res?.error) setError(res.error);
      else setMessage("Cambios guardados. Puedes seguir editando hasta el inicio del Mundial.");
    });
  }

  return (
    <div className="space-y-8">
      {/* Resumen sticky */}
      {!readOnly && (
        <div className="sticky top-14 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-zinc-50/95 dark:bg-zinc-950/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 text-sm">
          <span className="flex flex-wrap gap-x-3">
            <span>
              Grupos:{" "}
              <strong className={completedGroups === 12 ? "text-emerald-600" : ""}>
                {completedGroups}/12
              </strong>
            </span>
            <span className="hidden sm:inline">
              Campeón:{" "}
              <strong className={champion ? "text-emerald-600" : "text-zinc-400"}>
                {champion ? teamsById.get(champion)?.name : "—"}
              </strong>
            </span>
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={handleSave}
            className="text-sm rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-1.5 disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      )}

      {(error || message) && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            error
              ? "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300"
              : "bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {error || message}
        </div>
      )}

      {/* Fase de grupos */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">1. Fase de grupos</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Ordena los 4 equipos de cada grupo. Esto determina quiénes están
          disponibles en las rondas eliminatorias.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {GROUPS.map((g) => (
            <GroupBlock
              key={g}
              groupCode={g}
              groupTeams={teamsByGroup.get(g) ?? []}
              positions={groupPositions[g] ?? ["", "", "", ""]}
              onChange={(idx, teamId) => setPosition(g, idx, teamId)}
              readOnly={readOnly}
            />
          ))}
        </div>
      </section>

      {/* R32 */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold">2. Ronda de 32 (16vos)</h2>
        <details
          open
          className="rounded-xl border border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/50 text-sm text-sky-900 dark:text-sky-100"
        >
          <summary className="px-4 py-3 cursor-pointer font-semibold flex items-center gap-2">
            <span aria-hidden>ℹ️</span>
            ¿Cómo funciona la ronda de 32? (léelo, te va a ahorrar dudas)
          </summary>
          <div className="px-4 pb-4 space-y-3">
            <div>
              <p className="font-semibold mb-1">Quiénes pasan:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>
                  Los <strong>2 mejores de cada grupo</strong> → 24 equipos.
                </li>
                <li>
                  Los <strong>8 mejores 3° lugares</strong> entre los 12 grupos
                  → 8 equipos más.
                </li>
                <li>
                  Total: <strong>32 equipos</strong> que juegan{" "}
                  <strong>16 partidos</strong> de eliminación directa.
                </li>
              </ul>
            </div>

            <div>
              <p className="font-semibold mb-1">Cómo se arman los partidos:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>
                  <strong>8 partidos</strong> son <em>directos</em>: enfrentan a
                  un 1° contra un 2° (por ejemplo, “2° Grupo A vs 2° Grupo B”).
                  Aquí solo eliges el ganador.
                </li>
                <li>
                  <strong>Los otros 8 partidos</strong> tienen un{" "}
                  <strong>cupo de 3° lugar</strong>. Por reglas FIFA, ese cupo
                  lo puede ocupar el 3° de uno entre 5 grupos específicos (ej.
                  “3° entre los grupos A/B/C/D/F”).
                </li>
              </ul>
            </div>

            <div className="rounded-md bg-white/70 dark:bg-sky-950 px-3 py-2 border border-sky-200 dark:border-sky-900">
              <p className="font-semibold mb-1">
                Qué te preguntamos en estos 8 partidos:
              </p>
              <ol className="list-decimal list-inside space-y-0.5 ml-1">
                <li>
                  <strong>¿Cuál tercero juega aquí?</strong> — eliges de la
                  lista de 3° lugares de los grupos candidatos (según tu propia
                  predicción de grupos).
                </li>
                <li>
                  <strong>¿Quién gana?</strong> — eliges entre los dos equipos
                  resultantes.
                </li>
              </ol>
            </div>

            <p>
              <strong>Regla:</strong> cada 3° lugar puede usarse en{" "}
              <em>un solo partido</em>. Si ya asignaste, por ejemplo, al 3° de
              tu Grupo K en M79, aparecerá deshabilitado en los demás partidos
              donde podría caer.
            </p>
          </div>
        </details>
        <KORound
          title=""
          stage="r32"
          matches={byStage.get("r32") ?? []}
          getWinner={(id) => getWinner("r32", id)}
          setWinner={(id, teamId) => setWinner("r32", id, teamId)}
          resolveSlotTeam={resolveSlotTeam}
          isThirdPlaceSlot={isThirdPlaceSlot}
          poolForThirdPlace={poolForThirdPlace}
          thirdPlaceAssignment={r32ThirdPlace}
          setThirdPlaceAssignment={(id, teamId) =>
            setR32ThirdPlace((p) => ({ ...p, [id.toString()]: teamId }))
          }
          teamsById={teamsById}
          readOnly={readOnly}
        />
      </section>

      {/* R16 */}
      <KORound
        title="3. Octavos de final"
        description="Los equipos vienen automáticamente de los ganadores de R32. Solo eliges quién gana."
        stage="r16"
        matches={byStage.get("r16") ?? []}
        getWinner={(id) => getWinner("r16", id)}
        setWinner={(id, teamId) => setWinner("r16", id, teamId)}
        resolveSlotTeam={resolveSlotTeam}
        isThirdPlaceSlot={isThirdPlaceSlot}
        poolForThirdPlace={poolForThirdPlace}
        thirdPlaceAssignment={r32ThirdPlace}
        setThirdPlaceAssignment={() => {}}
        teamsById={teamsById}
        readOnly={readOnly}
      />

      {/* QF */}
      <KORound
        title="4. Cuartos de final"
        stage="qf"
        matches={byStage.get("qf") ?? []}
        getWinner={(id) => getWinner("qf", id)}
        setWinner={(id, teamId) => setWinner("qf", id, teamId)}
        resolveSlotTeam={resolveSlotTeam}
        isThirdPlaceSlot={isThirdPlaceSlot}
        poolForThirdPlace={poolForThirdPlace}
        thirdPlaceAssignment={r32ThirdPlace}
        setThirdPlaceAssignment={() => {}}
        teamsById={teamsById}
        readOnly={readOnly}
      />

      {/* SF */}
      <KORound
        title="5. Semifinales"
        stage="sf"
        matches={byStage.get("sf") ?? []}
        getWinner={(id) => getWinner("sf", id)}
        setWinner={(id, teamId) => setWinner("sf", id, teamId)}
        resolveSlotTeam={resolveSlotTeam}
        isThirdPlaceSlot={isThirdPlaceSlot}
        poolForThirdPlace={poolForThirdPlace}
        thirdPlaceAssignment={r32ThirdPlace}
        setThirdPlaceAssignment={() => {}}
        teamsById={teamsById}
        readOnly={readOnly}
      />

      {/* Final / Campeón */}
      <section className="space-y-4">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h2 className="text-2xl font-bold">6. Campeón del Mundial</h2>
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            30 pts
          </span>
        </div>
        {finalMatch && finalists.length === 2 ? (
          <>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Según tus semifinales, la final sería entre estos dos. ¿Quién
              levanta la copa? 🏆
            </p>
            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              {finalists.map((t) => {
                const selected = champion === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={readOnly}
                    onClick={() => setChampion(t.id)}
                    className={`relative p-6 sm:p-8 rounded-2xl border-2 text-center transition-all ${
                      selected
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950 shadow-lg shadow-emerald-500/20 scale-[1.02]"
                        : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {selected && (
                      <span className="absolute top-2 right-3 text-xl">🏆</span>
                    )}
                    <span
                      className="block text-5xl sm:text-7xl mb-3"
                      aria-hidden
                    >
                      {t.flag_emoji ?? "🏳️"}
                    </span>
                    <span
                      className={`block text-lg sm:text-xl font-bold ${
                        selected
                          ? "text-emerald-700 dark:text-emerald-300"
                          : ""
                      }`}
                    >
                      {t.name}
                    </span>
                    {t.group_code && (
                      <span className="block text-xs text-zinc-500 mt-1">
                        Grupo {t.group_code}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-500 italic">
            Completa las semifinales para elegir al campeón.
          </p>
        )}
      </section>

      {/* Premios especiales */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">7. Premios especiales</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Los premios de jugadores se escriben en texto. El equipo revelación lo
          decide el admin al final del torneo.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <PlayerCombobox
            label="Goleador del Mundial (25 pts)"
            placeholder="Selecciona o escribe un jugador"
            value={topScorer}
            onChange={setTopScorer}
            options={COMMON_TOP_SCORERS}
            listId="datalist-top-scorers"
            disabled={readOnly}
          />
          <PlayerCombobox
            label="Balón de Oro / Mejor jugador (15 pts)"
            placeholder="Selecciona o escribe un jugador"
            value={goldenBall}
            onChange={setGoldenBall}
            options={COMMON_TOP_SCORERS}
            listId="datalist-golden-ball"
            disabled={readOnly}
          />
          <PlayerCombobox
            label="Guante de Oro / Mejor portero (15 pts)"
            placeholder="Selecciona o escribe un portero"
            value={goldenGlove}
            onChange={setGoldenGlove}
            options={COMMON_GOLDEN_GLOVES}
            listId="datalist-golden-glove"
            disabled={readOnly}
          />
          <PlayerCombobox
            label="Mejor jugador joven (15 pts)"
            placeholder="Selecciona o escribe un jugador"
            value={youngPlayer}
            onChange={setYoungPlayer}
            options={COMMON_YOUNG_PLAYERS}
            listId="datalist-young-player"
            disabled={readOnly}
          />
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">
              Equipo revelación (15 pts)
            </label>
            <TeamSelect
              value={revelationTeam}
              onChange={setRevelationTeam}
              teams={teams}
              placeholder="Equipo que será la sorpresa positiva"
              disabled={readOnly}
            />
          </div>
        </div>
      </section>

      {!readOnly && (
        <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            disabled={pending}
            onClick={handleSave}
            className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2 disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      )}

      {tournamentStartIso && !readOnly && (
        <p className="text-xs text-zinc-500 text-center">
          Cierra el{" "}
          <span suppressHydrationWarning>
            {new Date(tournamentStartIso).toLocaleString("es-CO")}
          </span>{" "}
          (hora local).
        </p>
      )}
    </div>
  );
}

// ---------- subcomponentes ----------

function GroupBlock({
  groupCode,
  groupTeams,
  positions,
  onChange,
  readOnly,
}: {
  groupCode: string;
  groupTeams: Team[];
  positions: string[];
  onChange: (idx: number, teamId: string) => void;
  readOnly: boolean;
}) {
  const complete =
    positions.filter(Boolean).length === 4 && new Set(positions).size === 4;
  return (
    <div
      className={`rounded-xl border bg-white dark:bg-zinc-900 p-4 space-y-2.5 ${
        complete
          ? "border-emerald-300 dark:border-emerald-800"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Grupo {groupCode}</h3>
        {complete && (
          <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold">
            ✓ completo
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {[0, 1, 2, 3].map((idx) => {
          const taken = new Set(positions.filter((_, i) => i !== idx).filter(Boolean));
          return (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 w-6">{idx + 1}°</span>
              <select
                value={positions[idx] ?? ""}
                onChange={(e) => onChange(idx, e.target.value)}
                disabled={readOnly}
                className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-1.5 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
              >
                <option value="">— Elegir —</option>
                {groupTeams.map((t) => (
                  <option key={t.id} value={t.id} disabled={taken.has(t.id)}>
                    {t.flag_emoji ?? ""} {t.name}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type ResolveFn = (matchId: number, placeholder: string | null | undefined) => string | null;

function KORound({
  title,
  description,
  matches,
  getWinner,
  setWinner,
  resolveSlotTeam,
  isThirdPlaceSlot,
  poolForThirdPlace,
  thirdPlaceAssignment,
  setThirdPlaceAssignment,
  teamsById,
  readOnly,
}: {
  title: string;
  description?: string;
  stage: MatchStage;
  matches: Match[];
  getWinner: (matchId: number) => string;
  setWinner: (matchId: number, teamId: string) => void;
  resolveSlotTeam: ResolveFn;
  isThirdPlaceSlot: (placeholder: string | null | undefined) => boolean;
  poolForThirdPlace: (placeholder: string | null | undefined) => string[];
  thirdPlaceAssignment: Record<string, string>;
  setThirdPlaceAssignment: (matchId: number, teamId: string) => void;
  teamsById: Map<string, Team>;
  readOnly: boolean;
}) {
  if (matches.length === 0) return null;

  // Equipos ya usados como 3° lugar en otros partidos (para deshabilitar duplicados).
  // Map: teamId -> matchId donde está asignado
  const usedThirdPlaces = new Map<string, number>();
  for (const [mid, tid] of Object.entries(thirdPlaceAssignment)) {
    if (tid) usedThirdPlaces.set(tid, parseInt(mid, 10));
  }

  return (
    <section className="space-y-3">
      {title && <h2 className="text-xl font-bold">{title}</h2>}
      {description && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        {matches.map((m) => (
          <KOMatchRow
            key={m.id}
            match={m}
            winner={getWinner(m.id)}
            onChange={(teamId) => setWinner(m.id, teamId)}
            resolveSlotTeam={resolveSlotTeam}
            isThirdPlaceSlot={isThirdPlaceSlot}
            poolForThirdPlace={poolForThirdPlace}
            thirdPlaceAssignment={thirdPlaceAssignment}
            setThirdPlaceAssignment={(teamId) =>
              setThirdPlaceAssignment(m.id, teamId)
            }
            usedThirdPlaces={usedThirdPlaces}
            teamsById={teamsById}
            readOnly={readOnly}
          />
        ))}
      </div>
    </section>
  );
}

function KOMatchRow({
  match,
  winner,
  onChange,
  resolveSlotTeam,
  isThirdPlaceSlot,
  poolForThirdPlace,
  thirdPlaceAssignment,
  setThirdPlaceAssignment,
  usedThirdPlaces,
  teamsById,
  readOnly,
}: {
  match: Match;
  winner: string;
  onChange: (teamId: string) => void;
  resolveSlotTeam: ResolveFn;
  isThirdPlaceSlot: (placeholder: string | null | undefined) => boolean;
  poolForThirdPlace: (placeholder: string | null | undefined) => string[];
  thirdPlaceAssignment: Record<string, string>;
  setThirdPlaceAssignment: (teamId: string) => void;
  usedThirdPlaces?: Map<string, number>;
  teamsById: Map<string, Team>;
  readOnly: boolean;
}) {
  const homeIsThird = isThirdPlaceSlot(match.home_placeholder);
  const awayIsThird = isThirdPlaceSlot(match.away_placeholder);

  const homeId = resolveSlotTeam(match.id, match.home_placeholder);
  const awayId = resolveSlotTeam(match.id, match.away_placeholder);
  const homeTeam = homeId ? teamsById.get(homeId) : null;
  const awayTeam = awayId ? teamsById.get(awayId) : null;

  // Pool de 3° lugares para el slot que lo necesita
  const thirdPool = homeIsThird
    ? poolForThirdPlace(match.home_placeholder)
    : awayIsThird
      ? poolForThirdPlace(match.away_placeholder)
      : [];
  const thirdSelected = thirdPlaceAssignment[match.id.toString()] ?? "";
  const needsThirdAssignment = (homeIsThird || awayIsThird) && !thirdSelected;

  const winnerTeam = winner ? teamsById.get(winner) : null;

  // Para mostrar el placeholder del slot que aún no se conoce
  const homeLabel = homeIsThird ? match.home_placeholder : match.home_placeholder;
  const awayLabel = awayIsThird ? match.away_placeholder : match.away_placeholder;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 space-y-3">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span className="font-semibold">M{match.id}</span>
        <span className="text-right truncate ml-2">
          {homeLabel} vs {awayLabel}
        </span>
      </div>

      {/* Paso 1: asignar 3° lugar si aplica */}
      {(homeIsThird || awayIsThird) && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold mb-1">
            1. Elige el 3° lugar que juega aquí
          </p>
          {thirdPool.length === 0 ? (
            <p className="text-xs text-amber-600">
              Completa las posiciones de los grupos para ver candidatos.
            </p>
          ) : (
            <>
              <select
                value={thirdSelected}
                onChange={(e) => setThirdPlaceAssignment(e.target.value)}
                disabled={readOnly}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-1.5 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
              >
                <option value="">
                  — Elegir 3° lugar —
                </option>
                {thirdPool.map((id) => {
                  const t = teamsById.get(id);
                  if (!t) return null;
                  const usedInMatch = usedThirdPlaces?.get(id);
                  const usedElsewhere =
                    usedInMatch !== undefined && usedInMatch !== match.id;
                  return (
                    <option key={id} value={id} disabled={usedElsewhere}>
                      {t.flag_emoji ?? ""} {t.name} (3° Grupo {t.group_code})
                      {usedElsewhere ? ` — ya usado en M${usedInMatch}` : ""}
                    </option>
                  );
                })}
              </select>
              {thirdSelected && (
                <p className="text-[11px] text-zinc-500 mt-1">
                  ✓ Reservado para este partido. No aparecerá disponible en
                  otros.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Paso 2: elegir ganador del partido */}
      {homeTeam && awayTeam && !needsThirdAssignment ? (
        <div>
          {(homeIsThird || awayIsThird) && (
            <p className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold mb-1">
              2. ¿Quién gana?
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {[homeTeam, awayTeam].map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={readOnly}
                onClick={() => onChange(t.id)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-sm font-medium ${
                  winner === t.id
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                    : "border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                } disabled:opacity-60`}
              >
                <span aria-hidden>{t.flag_emoji ?? "🏳️"}</span>
                <span className="truncate">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-zinc-500 italic">
          Completa los pasos anteriores para elegir ganador.
        </p>
      )}

      {winnerTeam && (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          ✓ Ganador: {winnerTeam.flag_emoji} {winnerTeam.name}
        </p>
      )}
    </div>
  );
}

function TeamSelect({
  value,
  onChange,
  teams,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  teams: Team[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
    >
      <option value="">{placeholder}</option>
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.flag_emoji ?? ""} {t.name}
          {t.group_code ? ` (Grupo ${t.group_code})` : ""}
        </option>
      ))}
    </select>
  );
}

function PlayerCombobox({
  label,
  value,
  onChange,
  options,
  listId,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  listId: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </div>
  );
}
