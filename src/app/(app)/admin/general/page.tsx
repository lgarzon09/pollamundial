import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { BracketPrediction, BracketResults, Match, Team } from "@/lib/db/types";
import { BracketForm } from "@/components/BracketForm";
import { saveBracketResults } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminBracketResultsPage() {
  const supabase = await createClient();

  const [{ data: teams }, { data: matches }, { data: results }] = await Promise.all([
    supabase.from("teams").select("*").order("name", { ascending: true }),
    supabase
      .from("matches")
      .select("*")
      .neq("stage", "group")
      .order("id", { ascending: true }),
    supabase.from("bracket_results").select("*").eq("id", 1).maybeSingle(),
  ]);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Resultado de la predicción general</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Carga la <strong>realidad</strong> del torneo: el orden final de cada
          grupo y quién avanza en cada ronda. Con esto se calculan los puntos de
          la predicción general de cada participante. Puedes editarlo en cualquier
          momento a medida que avanza el Mundial.
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Los premios oficiales (goleador, balón de oro, etc.) se cargan en{" "}
          <Link
            href="/admin/resultados"
            className="text-emerald-600 hover:underline font-medium"
          >
            Resultados de partidos
          </Link>
          .
        </p>
      </header>

      <BracketForm
        teams={(teams ?? []) as Team[]}
        koMatches={(matches ?? []) as Match[]}
        initial={(results as BracketResults | null) as Partial<BracketPrediction> | null}
        readOnly={false}
        tournamentStartIso={null}
        variant="official"
        saveAction={saveBracketResults}
      />
    </main>
  );
}
