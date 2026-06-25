import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type {
  BracketResults,
  Match,
  MatchPrediction,
  MatchResult,
  Team,
} from "@/lib/db/types";
import { STAGE_SHORT } from "@/lib/db/types";
import { scoreMatch } from "@/lib/scoring";
import { withOfficialMatchTeams } from "@/lib/bracket";
import { fetchAllRows } from "@/lib/db/fetchAll";
import { AuditTable, type AuditMatch, type AuditRow } from "@/components/AuditTable";

export const dynamic = "force-dynamic";

const DAY_FMT = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  day: "numeric",
  month: "short",
});

export default async function AuditoriaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: matches },
    { data: results },
    { data: teams },
    { data: profiles },
    { data: allPredictions },
    { data: official },
  ] = await Promise.all([
    supabase.from("matches").select("*").order("kickoff_at", { ascending: true }),
    supabase.from("match_results").select("*"),
    supabase.from("teams").select("*"),
    supabase.from("profiles").select("id, display_name, is_admin"),
    fetchAllRows<MatchPrediction>((from, to) =>
      supabase
        .from("match_predictions")
        .select("*")
        .order("id", { ascending: true })
        .range(from, to),
    ).then((data) => ({ data })),
    supabase.from("bracket_results").select("*").eq("id", 1).maybeSingle(),
  ]);

  const teamsById = new Map<string, Team>((teams ?? []).map((t) => [t.id, t]));
  const officialBracket = (official as BracketResults | null) ?? null;
  const matchList = withOfficialMatchTeams(
    (matches ?? []) as Match[],
    officialBracket,
  );
  const resultsByMatch = new Map<number, MatchResult>(
    (results ?? []).map((r) => [r.match_id, r as MatchResult]),
  );

  // Etiqueta legible de un partido (equipos resueltos o placeholders + fecha).
  const teamLabel = (id: string | null, ph: string | null): string => {
    if (id) {
      const t = teamsById.get(id);
      if (t) return `${t.flag_emoji ?? ""} ${t.name}`.trim();
    }
    return ph ?? "?";
  };
  const matchCols: AuditMatch[] = matchList.map((m, i) => ({
    id: m.id,
    n: i + 1,
    stage: STAGE_SHORT[m.stage],
    finalized: !!resultsByMatch.get(m.id)?.is_finalized,
    label: `${teamLabel(m.home_team_id, m.home_placeholder)} vs ${teamLabel(
      m.away_team_id,
      m.away_placeholder,
    )} · ${DAY_FMT.format(new Date(m.kickoff_at))}`,
  }));

  // Predicciones por usuario.
  const predsByUser = new Map<string, Map<number, MatchPrediction>>();
  for (const p of (allPredictions ?? []) as MatchPrediction[]) {
    if (!predsByUser.has(p.user_id)) predsByUser.set(p.user_id, new Map());
    predsByUser.get(p.user_id)!.set(p.match_id, p);
  }

  // Una fila por participante con los puntos por partido.
  const rows: AuditRow[] = (profiles ?? [])
    .map((p) => {
      const preds = predsByUser.get(p.id) ?? new Map<number, MatchPrediction>();
      let total = 0;
      const cells = matchList.map((m) => {
        const r = resultsByMatch.get(m.id) ?? null;
        if (!r?.is_finalized) return null; // partido sin resultado aún
        const pts = scoreMatch(m, preds.get(m.id) ?? null, r).total;
        total += pts;
        return pts;
      });
      return {
        id: p.id,
        name: p.display_name,
        isAdmin: !!p.is_admin,
        total,
        cells,
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  return (
    <main className="max-w-full mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-5">
      <header className="space-y-1">
        <div className="flex items-center gap-3 text-sm">
          <Link href="/mi-resumen" className="text-zinc-500 hover:text-emerald-600">
            ← Inicio
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">Auditoría de puntos</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-3xl">
          Puntos <strong>por partido</strong> de cada participante, partido por
          partido. Sirve para verificar de dónde sale el puntaje de cada quien.
          Los valores quedan fijos una vez el admin carga el resultado oficial
          de un partido.
        </p>
      </header>

      <AuditTable matches={matchCols} rows={rows} highlightUserId={user.id} />
    </main>
  );
}
