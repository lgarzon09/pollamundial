import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type {
  BracketPrediction,
  BracketResults,
  Match,
  Team,
  TournamentResults,
} from "@/lib/db/types";
import { BracketForm } from "@/components/BracketForm";
import { BracketScoreBreakdown } from "@/components/BracketScoreBreakdown";
import { scoreBracket } from "@/lib/scoring";

export const dynamic = "force-dynamic";

// ¿El bracket oficial / premios ya tienen algún dato cargado por el admin?
function hasOfficialData(
  official: BracketResults | null,
  tournament: TournamentResults | null,
): boolean {
  if (official) {
    if (Object.keys(official.group_positions ?? {}).length > 0) return true;
    if (official.champion) return true;
    for (const k of ["r32_winners", "r16_winners", "qf_winners", "sf_winners"] as const) {
      if (Object.keys(official[k] ?? {}).length > 0) return true;
    }
  }
  if (tournament) {
    if (
      tournament.top_scorer ||
      tournament.golden_ball ||
      tournament.golden_glove ||
      tournament.young_player ||
      tournament.revelation_team
    )
      return true;
  }
  return false;
}

export default async function PrediccionGeneralPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: settings },
    { data: teams },
    { data: matches },
    { data: bracket },
    { data: official },
    { data: tournament },
  ] = await Promise.all([
    supabase
      .from("settings")
      .select("tournament_start_at")
      .eq("id", 1)
      .maybeSingle(),
    supabase.from("teams").select("*").order("name", { ascending: true }),
    supabase
      .from("matches")
      .select("*")
      .neq("stage", "group")
      .order("id", { ascending: true }),
    supabase
      .from("bracket_predictions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("bracket_results").select("*").eq("id", 1).maybeSingle(),
    supabase.from("tournament_results").select("*").eq("id", 1).maybeSingle(),
  ]);

  const officialBracket = (official as BracketResults | null) ?? null;
  const tournamentResults = (tournament as TournamentResults | null) ?? null;
  const userBracket = (bracket as BracketPrediction | null) ?? null;
  const showScore =
    !!userBracket && hasOfficialData(officialBracket, tournamentResults);
  const bracketScore = showScore
    ? scoreBracket(userBracket, officialBracket, tournamentResults)
    : null;

  const tournamentStart = settings?.tournament_start_at
    ? new Date(settings.tournament_start_at)
    : null;
  const locked = tournamentStart ? tournamentStart.getTime() <= Date.now() : false;
  const readOnly = locked;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Mi predicción general</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Predice cómo crees que va a quedar todo el Mundial: grupos, rondas
          eliminatorias, campeón y premios. Se cierra al iniciar el primer partido.
        </p>
      </header>

      {locked ? (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950 p-4 text-sm text-amber-800 dark:text-amber-200">
          La predicción general está <strong>cerrada</strong>. El Mundial ya
          inició y no se puede editar más.
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-sm text-zinc-700 dark:text-zinc-300">
          Puedes editar y guardar cuantas veces quieras hasta el inicio del
          Mundial. Lee las{" "}
          <Link href="/reglas" className="text-emerald-600 hover:underline font-medium">
            reglas de puntuación
          </Link>{" "}
          si tienes dudas.
        </div>
      )}

      {bracketScore && (
        <BracketScoreBreakdown
          score={bracketScore}
          hint="Suma a medida que el admin carga el resultado real del torneo. Es independiente de tus predicciones por partido."
        />
      )}

      <BracketForm
        teams={(teams ?? []) as Team[]}
        koMatches={(matches ?? []) as Match[]}
        initial={userBracket}
        readOnly={readOnly}
        tournamentStartIso={tournamentStart?.toISOString() ?? null}
      />
    </main>
  );
}
