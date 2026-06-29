import { createClient } from "@/lib/supabase/server";
import type {
  BracketResults,
  Match,
  MatchResult,
  Team,
  TournamentResults,
} from "@/lib/db/types";
import { AdminMatchList } from "@/components/AdminMatchList";
import { AdminTournamentResults } from "@/components/AdminTournamentResults";
import { withOfficialMatchTeams } from "@/lib/bracket";

export const dynamic = "force-dynamic";

export default async function AdminResultadosPage() {
  const supabase = await createClient();

  const [
    { data: matches },
    { data: results },
    { data: teams },
    { data: tournament },
    { data: official },
  ] = await Promise.all([
    supabase.from("matches").select("*").order("kickoff_at", { ascending: true }),
    supabase.from("match_results").select("*"),
    supabase.from("teams").select("*"),
    supabase
      .from("tournament_results")
      .select("*")
      .eq("id", 1)
      .maybeSingle(),
    supabase.from("bracket_results").select("*").eq("id", 1).maybeSingle(),
  ]);

  // Rellena los equipos KO ya confirmados por el resultado OFICIAL del torneo
  // (1°/2° de grupo, 3° asignados, ganadores reales), igual que la página de
  // predicciones. Sin esto, los partidos de eliminatoria seguirían con
  // home_team_id/away_team_id en null y no se podrían editar.
  const matchList = withOfficialMatchTeams(
    (matches ?? []) as Match[],
    (official as BracketResults | null) ?? null,
  );

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Resultados de partidos</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Carga marcadores finalizados. Al guardar un resultado de eliminatoria,
          el ganador avanza automáticamente al siguiente partido.
        </p>
      </header>

      <AdminMatchList
        matches={matchList}
        results={(results ?? []) as MatchResult[]}
        teams={(teams ?? []) as Team[]}
      />

      <AdminTournamentResults
        teams={(teams ?? []) as Team[]}
        initial={(tournament as TournamentResults | null) ?? null}
      />
    </main>
  );
}
