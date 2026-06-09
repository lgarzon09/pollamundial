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

export default async function PrediccionesPartidosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: matches },
    { data: predictions },
    { data: results },
    { data: teams },
    { data: settings },
  ] = await Promise.all([
    supabase.from("matches").select("*").order("kickoff_at", { ascending: true }),
    supabase.from("match_predictions").select("*").eq("user_id", user.id),
    supabase.from("match_results").select("*"),
    supabase.from("teams").select("*"),
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="space-y-3">
        <div>
          <h1 className="text-3xl font-bold">Predicciones por partido</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Pon el marcador de cada partido para acumular puntos.
          </p>
        </div>
        <div className="rounded-xl border border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/50 p-4 text-sm text-sky-900 dark:text-sky-100">
          <p className="font-semibold mb-1">💡 Cómo usar esta página día a día</p>
          <ul className="list-disc list-inside space-y-0.5 ml-1">
            <li>
              Cada día se juegan varios partidos. Expande el día de hoy y deja
              el marcador que predices para cada uno.
            </li>
            <li>
              Puedes editar tu predicción hasta{" "}
              <strong>10 minutos antes del kickoff</strong> de cada partido.
              Después se cierra y queda como esté.
            </li>
            <li>
              No estás obligado a predecir todos: lo que no llenes simplemente
              no suma. Pero llenar más = más oportunidades de puntos.
            </li>
            <li>
              Cuando termine el partido y el admin cargue el resultado, verás
              tus puntos al expandir el partido.
            </li>
          </ul>
        </div>
      </header>

      <PredictionsByDay
        matches={(matches ?? []) as Match[]}
        teams={(teams ?? []) as Team[]}
        predictions={(predictions ?? []) as MatchPrediction[]}
        results={(results ?? []) as MatchResult[]}
        settings={(settings as Settings) ?? null}
        readOnly={false}
        ownerLabel="tu predicción"
      />
    </main>
  );
}
