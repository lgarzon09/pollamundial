import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  BracketPrediction,
  BracketResults,
  Match,
  MatchPrediction,
  MatchResult,
  Settings,
  Team,
  TournamentResults,
} from "@/lib/db/types";
import { PredictionsByDay } from "@/components/PredictionsByDay";
import { KORoundBlock } from "@/components/KORoundBlock";
import { BracketScoreBreakdown } from "@/components/BracketScoreBreakdown";
import { PointsBadge } from "@/components/PointsBadge";
import { bracketPickPoints, scoreBracket, type PickPoints } from "@/lib/scoring";
import { makeSlotResolver, withOfficialMatchTeams } from "@/lib/bracket";

export const dynamic = "force-dynamic";

const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

export default async function ParticipanteDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: profile },
    { data: matches },
    { data: predictions },
    { data: results },
    { data: teams },
    { data: settings },
    { data: bracket },
    { data: official },
    { data: tournament },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, is_admin")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("matches").select("*").order("kickoff_at", { ascending: true }),
    supabase.from("match_predictions").select("*").eq("user_id", id),
    supabase.from("match_results").select("*"),
    supabase.from("teams").select("*"),
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("bracket_predictions")
      .select("*")
      .eq("user_id", id)
      .maybeSingle(),
    supabase.from("bracket_results").select("*").eq("id", 1).maybeSingle(),
    supabase.from("tournament_results").select("*").eq("id", 1).maybeSingle(),
  ]);

  if (!profile) notFound();

  const teamsById = new Map<string, Team>((teams ?? []).map((t) => [t.id, t]));

  const tournamentStart = (settings as Settings | null)?.tournament_start_at
    ? new Date((settings as Settings).tournament_start_at)
    : null;
  const bracketVisible = tournamentStart
    ? tournamentStart.getTime() <= Date.now()
    : false;
  const br = (bracket as BracketPrediction | null) ?? null;

  // Desglose de puntos de la predicción general (sólo si el admin ya cargó
  // algo del resultado oficial / premios). Mismo cálculo que en "mi resumen".
  const officialBracket = (official as BracketResults | null) ?? null;
  const tournamentResults = (tournament as TournamentResults | null) ?? null;

  // Rellena los equipos KO ya confirmados por el resultado oficial del torneo.
  const matchList = withOfficialMatchTeams(
    (matches ?? []) as Match[],
    officialBracket,
  );
  const officialDataReady =
    (!!officialBracket &&
      (Object.keys(officialBracket.group_positions ?? {}).length > 0 ||
        !!officialBracket.champion ||
        Object.keys(officialBracket.r32_winners ?? {}).length > 0)) ||
    (!!tournamentResults &&
      !!(
        tournamentResults.top_scorer ||
        tournamentResults.golden_ball ||
        tournamentResults.golden_glove ||
        tournamentResults.young_player ||
        tournamentResults.revelation_team
      ));
  const bracketScore =
    br && officialDataReady
      ? scoreBracket(br, officialBracket, tournamentResults, teamsById)
      : null;
  const pickPts =
    br && officialDataReady
      ? bracketPickPoints(br, officialBracket, tournamentResults)
      : null;
  const matchesById = new Map<number, Match>(matchList.map((m) => [m.id, m]));
  const slotResolver = br ? makeSlotResolver(br, matchesById) : undefined;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/participantes"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Participantes
          </Link>
          <h1 className="text-3xl font-bold mt-1">{profile.display_name}</h1>
        </div>
      </header>

      {/* Predicciones por partido (primero, abierto por defecto) */}
      <details
        open
        className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
      >
        <summary className="px-4 sm:px-5 py-3 cursor-pointer flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40 list-none">
          <h2 className="font-semibold">Predicciones por partido</h2>
          <span
            className="text-zinc-400 group-open:rotate-180 transition-transform"
            aria-hidden
          >
            ▾
          </span>
        </summary>
        <div className="px-4 sm:px-5 py-4 space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Sólo verás las de partidos que ya están cerrados (10 min antes del
            kickoff).
          </p>
          <PredictionsByDay
            matches={matchList}
            teams={(teams ?? []) as Team[]}
            predictions={(predictions ?? []) as MatchPrediction[]}
            results={(results ?? []) as MatchResult[]}
            settings={(settings as Settings) ?? null}
            readOnly
            ownerLabel={profile.display_name}
          />
        </div>
      </details>

      {/* Predicción general (después, cerrado por defecto) */}
      <details className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <summary className="px-4 sm:px-5 py-3 cursor-pointer flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40 list-none">
          <h2 className="font-semibold">Predicción general</h2>
          <span
            className="text-zinc-400 group-open:rotate-180 transition-transform"
            aria-hidden
          >
            ▾
          </span>
        </summary>
        {!bracketVisible ? (
          <p className="px-5 py-6 text-sm text-zinc-500 border-t border-zinc-100 dark:border-zinc-800">
            La predicción general de los demás se hace pública cuando inicie el
            Mundial.
          </p>
        ) : !br ? (
          <p className="px-5 py-6 text-sm text-zinc-500 border-t border-zinc-100 dark:border-zinc-800">
            {profile.display_name} no llenó su predicción general.
          </p>
        ) : (
          <div className="p-5 space-y-5 text-sm border-t border-zinc-100 dark:border-zinc-800">
            {bracketScore && (
              <BracketScoreBreakdown
                score={bracketScore}
                title={`Puntos de la predicción general de ${profile.display_name}`}
                hint="Toca cada línea para ver qué equipos suman los puntos."
              />
            )}
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2">
                Posiciones de grupos
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {GROUPS.map((g) => {
                  const positions = br.group_positions?.[g] ?? [];
                  return (
                    <div
                      key={g}
                      className="rounded border border-zinc-200 dark:border-zinc-800 p-2.5"
                    >
                      <p className="font-semibold text-xs mb-1">Grupo {g}</p>
                      <ol className="text-xs space-y-0.5">
                        {[0, 1, 2, 3].map((i) => {
                          const t = positions[i] ? teamsById.get(positions[i]) : null;
                          return (
                            <li key={i} className="flex items-center gap-1.5">
                              <span className="text-zinc-400 w-5">{i + 1}°</span>
                              {t ? (
                                <span>
                                  {t.flag_emoji} {t.name}
                                  <PointsBadge pick={pickPts?.groupPositions[g]?.[i]} />
                                </span>
                              ) : (
                                <span className="text-zinc-400 italic">—</span>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  );
                })}
              </div>
            </div>

            <KORoundBlock
              title="Ronda de 32 (16vos)"
              matches={matchList.filter((m) => m.stage === "r32")}
              winners={br.r32_winners ?? {}}
              teamsById={teamsById}
              points={pickPts?.koWinners}
              resolve={slotResolver}
            />
            <KORoundBlock
              title="Octavos de final"
              matches={matchList.filter((m) => m.stage === "r16")}
              winners={br.r16_winners ?? {}}
              teamsById={teamsById}
              points={pickPts?.koWinners}
              resolve={slotResolver}
            />
            <KORoundBlock
              title="Cuartos de final"
              matches={matchList.filter((m) => m.stage === "qf")}
              winners={br.qf_winners ?? {}}
              teamsById={teamsById}
              points={pickPts?.koWinners}
              resolve={slotResolver}
            />
            <KORoundBlock
              title="Semifinales"
              matches={matchList.filter((m) => m.stage === "sf")}
              winners={br.sf_winners ?? {}}
              teamsById={teamsById}
              points={pickPts?.koWinners}
              resolve={slotResolver}
            />

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
              <BracketLine
                label="Campeón"
                value={
                  br.champion
                    ? `${teamsById.get(br.champion)?.flag_emoji ?? ""} ${teamsById.get(br.champion)?.name ?? "?"}`
                    : null
                }
                earned={pickPts?.champion}
              />
              <BracketLine
                label="Equipo revelación"
                value={
                  br.revelation_team
                    ? `${teamsById.get(br.revelation_team)?.flag_emoji ?? ""} ${teamsById.get(br.revelation_team)?.name ?? "?"}`
                    : null
                }
                earned={pickPts?.revelationTeam}
              />
              <BracketLine label="Goleador" value={br.top_scorer} earned={pickPts?.topScorer} />
              <BracketLine label="Balón de Oro" value={br.golden_ball} earned={pickPts?.goldenBall} />
              <BracketLine label="Guante de Oro" value={br.golden_glove} earned={pickPts?.goldenGlove} />
              <BracketLine label="Mejor jugador joven" value={br.young_player} earned={pickPts?.youngPlayer} />
            </div>
          </div>
        )}
      </details>
    </main>
  );
}

function BracketLine({
  label,
  value,
  earned,
}: {
  label: string;
  value: string | null;
  earned?: PickPoints;
}) {
  return (
    <div className="flex items-center justify-between border-b border-dotted border-zinc-200 dark:border-zinc-800 pb-1.5">
      <span className="text-zinc-500">{label}</span>
      <span>
        {value ? (
          <>
            {value}
            <PointsBadge pick={earned} />
          </>
        ) : (
          <span className="text-zinc-400 italic">—</span>
        )}
      </span>
    </div>
  );
}
