import { createClient } from "@/lib/supabase/server";
import type {
  BracketPrediction,
  BracketResults,
  Match,
  MatchPrediction,
  MatchResult,
  Team,
  TournamentResults,
} from "@/lib/db/types";
import { scoreBracket, totalMatchPoints } from "@/lib/scoring";
import { withOfficialMatchTeams } from "@/lib/bracket";
import { fetchAllRows } from "@/lib/db/fetchAll";
import { DailySummaryShare } from "@/components/DailySummaryShare";

export const dynamic = "force-dynamic";

// Día (YYYY-MM-DD) en hora de Bogotá: los strings ordenan cronológicamente.
const BOGOTA_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const DATE_LONG = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  weekday: "long",
  day: "numeric",
  month: "long",
});

const fmt = (n: number) => n.toString().replace(/\.0$/, "");

export default async function ResumenDiarioPage() {
  const supabase = await createClient();

  const [
    { data: matches },
    { data: results },
    { data: teams },
    { data: profiles },
    { data: allPredictions },
    { data: allBrackets },
    { data: official },
    { data: tournament },
  ] = await Promise.all([
    supabase.from("matches").select("*").order("kickoff_at", { ascending: true }),
    supabase.from("match_results").select("*"),
    supabase.from("teams").select("*"),
    supabase.from("profiles").select("id, display_name, is_admin"),
    // Todas las predicciones, paginadas (la tabla supera 1000 filas).
    fetchAllRows<MatchPrediction>((from, to) =>
      supabase
        .from("match_predictions")
        .select("*")
        .order("id", { ascending: true })
        .range(from, to),
    ).then((data) => ({ data })),
    supabase.from("bracket_predictions").select("*"),
    supabase.from("bracket_results").select("*").eq("id", 1).maybeSingle(),
    supabase.from("tournament_results").select("*").eq("id", 1).maybeSingle(),
  ]);

  const teamsById = new Map<string, Team>((teams ?? []).map((t) => [t.id, t]));
  const officialBracket = (official as BracketResults | null) ?? null;
  const tournamentResults = (tournament as TournamentResults | null) ?? null;
  const matchList = withOfficialMatchTeams(
    (matches ?? []) as Match[],
    officialBracket,
  );

  const today = BOGOTA_DAY.format(new Date());
  const dayOf = (iso: string | null) =>
    iso ? BOGOTA_DAY.format(new Date(iso)) : null;

  // Resultados finalizados: todos (hoy) y los de días anteriores (ayer).
  const finalized = (results ?? []).filter(
    (r) => r.is_finalized && r.finalized_at,
  ) as MatchResult[];
  const resultsNow = new Map<number, MatchResult>(
    finalized.map((r) => [r.match_id, r]),
  );
  const resultsBeforeToday = new Map<number, MatchResult>(
    finalized.filter((r) => dayOf(r.finalized_at)! < today).map((r) => [r.match_id, r]),
  );

  // ¿La predicción general (bracket/premios oficiales) se cargó HOY?
  // Si fue así, ayer valía 0 y su salto cuenta como ganado hoy.
  const bracketUpdatedToday =
    dayOf(officialBracket?.updated_at ?? null) === today ||
    dayOf(tournamentResults?.updated_at ?? null) === today;

  // Predicciones por usuario.
  const predsByUser = new Map<string, Map<number, MatchPrediction>>();
  for (const p of (allPredictions ?? []) as MatchPrediction[]) {
    if (!predsByUser.has(p.user_id)) predsByUser.set(p.user_id, new Map());
    predsByUser.get(p.user_id)!.set(p.match_id, p);
  }
  const bracketsByUser = new Map<string, BracketPrediction>(
    ((allBrackets ?? []) as BracketPrediction[]).map((b) => [b.user_id, b]),
  );

  const ranked = (profiles ?? [])
    .map((p) => {
      const userPreds =
        predsByUser.get(p.id) ?? new Map<number, MatchPrediction>();
      const now = totalMatchPoints(matchList, userPreds, resultsNow);
      const yest = totalMatchPoints(matchList, userPreds, resultsBeforeToday);
      const bracketTotal = scoreBracket(
        bracketsByUser.get(p.id) ?? null,
        officialBracket,
        tournamentResults,
        teamsById,
      ).total;
      const bracketYesterday = bracketUpdatedToday ? 0 : bracketTotal;
      const grandTotal = now.total + bracketTotal;
      const grandYesterday = yest.total + bracketYesterday;
      return {
        id: p.id,
        name: p.display_name,
        exactCount: now.exactCount,
        total: grandTotal,
        gainedToday: grandTotal - grandYesterday,
      };
    })
    .sort(
      (a, b) =>
        b.total - a.total ||
        b.exactCount - a.exactCount ||
        a.name.localeCompare(b.name),
    );

  // Partidos finalizados HOY, para el bloque de resultados del mensaje.
  const todayResults = matchList
    .filter((m) => {
      const r = resultsNow.get(m.id);
      return r && dayOf(r.finalized_at)! === today;
    })
    .map((m) => {
      const r = resultsNow.get(m.id)!;
      const home = m.home_team_id ? teamsById.get(m.home_team_id) : null;
      const away = m.away_team_id ? teamsById.get(m.away_team_id) : null;
      const homeName = home?.name ?? m.home_placeholder ?? "?";
      const awayName = away?.name ?? m.away_placeholder ?? "?";
      return `${home?.flag_emoji ?? ""} ${homeName} ${r.home_score_90}–${r.away_score_90} ${awayName} ${away?.flag_emoji ?? ""}`.trim();
    });

  // ===== Texto del mensaje (listo para reenviar) =====
  const dateLabel = DATE_LONG.format(new Date());
  const medal = (i: number) =>
    i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;

  const lines: string[] = [];
  lines.push("🏆 Polla Mundial 2026");
  lines.push(`📅 Resumen del ${dateLabel}`);
  lines.push("");
  lines.push("⚽ Resultados de hoy:");
  if (todayResults.length > 0) {
    for (const r of todayResults) lines.push(r);
  } else {
    lines.push("Hoy no se cargaron resultados nuevos.");
  }
  lines.push("");
  lines.push("📊 Tabla (total · lo de hoy):");
  ranked.forEach((p, i) => {
    const gain = p.gainedToday > 0 ? ` (+${fmt(p.gainedToday)} hoy)` : "";
    lines.push(`${medal(i)} ${p.name} — ${fmt(p.total)}${gain}`);
  });
  lines.push("");
  lines.push("El número entre paréntesis es lo que sumó hoy. ¡A seguir! 🔥");
  const text = lines.join("\n");
  const subject = `Polla Mundial — Resumen del ${dateLabel}`;

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Resumen diario</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
          Mensaje listo para reenviar con la tabla de todos y lo que cada quien
          sumó <strong>hoy</strong> ({today}, hora de Colombia). &ldquo;Hoy&rdquo;
          son los puntos de partidos cuyo resultado quedó cargado durante el día
          de hoy. Ábrelo, compártelo y reenvíalo por donde quieras.
        </p>
      </header>

      <DailySummaryShare text={text} subject={subject} />

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40">
          <h2 className="font-semibold text-sm">Vista previa</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-2 text-left w-10">#</th>
              <th className="px-4 py-2 text-left">Participante</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-right">Hoy</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p, i) => (
              <tr
                key={p.id}
                className="border-t border-zinc-100 dark:border-zinc-800"
              >
                <td className="px-4 py-2 text-zinc-500">{i + 1}</td>
                <td className="px-4 py-2 font-medium">{p.name}</td>
                <td className="px-4 py-2 text-right font-mono font-semibold">
                  {fmt(p.total)}
                </td>
                <td className="px-4 py-2 text-right font-mono">
                  {p.gainedToday > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      +{fmt(p.gainedToday)}
                    </span>
                  ) : (
                    <span className="text-zinc-300 dark:text-zinc-700">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
