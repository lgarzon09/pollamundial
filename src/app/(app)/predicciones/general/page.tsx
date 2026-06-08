import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { BracketPrediction, Match, Team } from "@/lib/db/types";
import { BracketForm } from "@/components/BracketForm";

export const dynamic = "force-dynamic";

export default async function PrediccionGeneralPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: settings }, { data: teams }, { data: matches }, { data: bracket }] =
    await Promise.all([
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
    ]);

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

      <BracketForm
        teams={(teams ?? []) as Team[]}
        koMatches={(matches ?? []) as Match[]}
        initial={(bracket as BracketPrediction | null) ?? null}
        readOnly={readOnly}
        tournamentStartIso={tournamentStart?.toISOString() ?? null}
      />
    </main>
  );
}
