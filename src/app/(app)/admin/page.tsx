import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Match, MatchResult, Team, TournamentResults } from "@/lib/db/types";
import { AdminMatchList } from "@/components/AdminMatchList";
import { AdminTournamentResults } from "@/components/AdminTournamentResults";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-12 text-center">
        <h1 className="text-2xl font-bold">Acceso denegado</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
          Sólo el admin de la polla puede ver esta página.
        </p>
        <Link
          href="/mi-resumen"
          className="inline-block mt-4 text-sm text-emerald-600 hover:underline"
        >
          ← Volver al inicio
        </Link>
      </main>
    );
  }

  const [{ data: matches }, { data: results }, { data: teams }, { data: tournament }] =
    await Promise.all([
      supabase.from("matches").select("*").order("kickoff_at", { ascending: true }),
      supabase.from("match_results").select("*"),
      supabase.from("teams").select("*"),
      supabase
        .from("tournament_results")
        .select("*")
        .eq("id", 1)
        .maybeSingle(),
    ]);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Panel admin</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Sólo tú (admin) puedes cargar resultados oficiales. Al guardar un
          resultado de eliminatoria, el ganador avanza automáticamente al
          siguiente partido.
        </p>
      </header>

      <AdminMatchList
        matches={(matches ?? []) as Match[]}
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
