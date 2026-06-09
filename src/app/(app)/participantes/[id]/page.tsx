import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  BracketPrediction,
  Match,
  MatchPrediction,
  MatchResult,
  Settings,
  Team,
} from "@/lib/db/types";
import { PredictionsByDay } from "@/components/PredictionsByDay";

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
    // RLS: solo retornará data si tournament ya inició o si es del propio usuario
    supabase
      .from("bracket_predictions")
      .select("*")
      .eq("user_id", id)
      .maybeSingle(),
  ]);

  if (!profile) notFound();

  const teamsById = new Map<string, Team>((teams ?? []).map((t) => [t.id, t]));
  const resultsByMatch = new Map<number, MatchResult>(
    (results ?? []).map((r) => [r.match_id, r as MatchResult]),
  );
  const predictionsByMatch = new Map<number, MatchPrediction>(
    (predictions ?? []).map((p) => [p.match_id, p as MatchPrediction]),
  );

  const tournamentStart = (settings as Settings | null)?.tournament_start_at
    ? new Date((settings as Settings).tournament_start_at)
    : null;
  const bracketVisible = tournamentStart
    ? tournamentStart.getTime() <= Date.now()
    : false;
  const br = (bracket as BracketPrediction | null) ?? null;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
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

      {/* Predicción general (bracket) — solo visible para los demás después del inicio del Mundial */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="font-semibold">Predicción general</h2>
        </div>
        {!bracketVisible ? (
          <p className="px-5 py-6 text-sm text-zinc-500">
            La predicción general de los demás se hace pública cuando inicie el
            Mundial.
          </p>
        ) : !br ? (
          <p className="px-5 py-6 text-sm text-zinc-500">
            {profile.display_name} no llenó su predicción general.
          </p>
        ) : (
          <div className="p-5 space-y-5 text-sm">
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

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
              <BracketLine
                label="Campeón"
                value={
                  br.champion
                    ? `${teamsById.get(br.champion)?.flag_emoji ?? ""} ${teamsById.get(br.champion)?.name ?? "?"}`
                    : null
                }
              />
              <BracketLine
                label="Equipo revelación"
                value={
                  br.revelation_team
                    ? `${teamsById.get(br.revelation_team)?.flag_emoji ?? ""} ${teamsById.get(br.revelation_team)?.name ?? "?"}`
                    : null
                }
              />
              <BracketLine label="Goleador" value={br.top_scorer} />
              <BracketLine label="Balón de Oro" value={br.golden_ball} />
              <BracketLine label="Guante de Oro" value={br.golden_glove} />
              <BracketLine label="Mejor jugador joven" value={br.young_player} />
            </div>
          </div>
        )}
      </section>

      {/* Predicciones por partido — visibles partido por partido tras cierre */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Predicciones por partido</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Sólo verás las de partidos que ya están cerrados (10 min antes del
          kickoff).
        </p>
        <PredictionsByDay
          matches={(matches ?? []) as Match[]}
          teamsById={teamsById}
          predictionsByMatch={predictionsByMatch}
          resultsByMatch={resultsByMatch}
          settings={(settings as Settings) ?? null}
          readOnly
          ownerLabel={profile.display_name}
        />
      </section>
    </main>
  );
}

function BracketLine({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-dotted border-zinc-200 dark:border-zinc-800 pb-1.5">
      <span className="text-zinc-500">{label}</span>
      <span>{value || <span className="text-zinc-400 italic">—</span>}</span>
    </div>
  );
}
