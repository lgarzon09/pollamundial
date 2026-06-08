import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  Match,
  MatchPrediction,
  MatchResult,
  Settings,
  Team,
} from "@/lib/db/types";
import { PredictionsByDay } from "@/components/PredictionsByDay";

export const dynamic = "force-dynamic";

export default async function JugadorDetalle({
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
  ]);

  if (!profile) notFound();

  const teamsById = new Map<string, Team>((teams ?? []).map((t) => [t.id, t]));
  const resultsByMatch = new Map<number, MatchResult>(
    (results ?? []).map((r) => [r.match_id, r as MatchResult]),
  );
  const predictionsByMatch = new Map<number, MatchPrediction>(
    (predictions ?? []).map((p) => [p.match_id, p as MatchPrediction]),
  );

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/jugadores"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Jugadores
          </Link>
          <h1 className="text-3xl font-bold mt-1">{profile.display_name}</h1>
        </div>
      </header>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Estas son las predicciones de {profile.display_name}. Sólo verás las
        de partidos que ya están cerrados (10 min antes del kickoff).
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
    </main>
  );
}
