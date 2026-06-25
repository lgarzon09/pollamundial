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

  // Este mensaje se envía EN LA MAÑANA y recapitula AYER. "Ayer" es el día
  // (zona Bogotá) anterior al de hoy; los totales son los del cierre de ayer.
  const now = new Date();
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const today = BOGOTA_DAY.format(now);
  const yesterday = BOGOTA_DAY.format(yesterdayDate);
  const dayOf = (iso: string | null) =>
    iso ? BOGOTA_DAY.format(new Date(iso)) : null;

  // Resultados finalizados, partidos según el día en que se cargó el resultado:
  //  - hastaAyer  = quedaron cargados hasta el cierre de ayer (día < hoy)
  //  - antesDeAyer = quedaron cargados antes de ayer (día < ayer)
  // La diferencia entre ambos aísla lo que se sumó AYER.
  const finalized = (results ?? []).filter(
    (r) => r.is_finalized && r.finalized_at,
  ) as MatchResult[];
  const resultsThroughYesterday = new Map<number, MatchResult>(
    finalized.filter((r) => dayOf(r.finalized_at)! < today).map((r) => [r.match_id, r]),
  );
  const resultsBeforeYesterday = new Map<number, MatchResult>(
    finalized.filter((r) => dayOf(r.finalized_at)! < yesterday).map((r) => [r.match_id, r]),
  );

  // Para los puntos GENERALES (predicción general): sólo cuentan los resultados
  // oficiales del torneo cargados hasta cierto día. Se filtran de forma
  // independiente el bracket oficial y los premios (pueden cargarse en días
  // distintos), pasando null a scoreBracket cuando aún no aplican.
  const onOrBefore = (iso: string | null, day: string) => {
    const d = dayOf(iso);
    return d != null && d <= day;
  };
  const offThroughYesterday =
    officialBracket && onOrBefore(officialBracket.updated_at, yesterday)
      ? officialBracket
      : null;
  const tourThroughYesterday =
    tournamentResults && onOrBefore(tournamentResults.updated_at, yesterday)
      ? tournamentResults
      : null;
  const offBeforeYesterday =
    officialBracket && dayOf(officialBracket.updated_at)! < yesterday
      ? officialBracket
      : null;
  const tourBeforeYesterday =
    tournamentResults && dayOf(tournamentResults.updated_at)! < yesterday
      ? tournamentResults
      : null;

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
      const myBracket = bracketsByUser.get(p.id) ?? null;

      // Puntos por PARTIDO: total al cierre de ayer y lo ganado ayer.
      const matchThrough = totalMatchPoints(
        matchList,
        userPreds,
        resultsThroughYesterday,
      );
      const matchBefore = totalMatchPoints(
        matchList,
        userPreds,
        resultsBeforeYesterday,
      );
      const matchTotal = matchThrough.total;
      const matchGain = matchTotal - matchBefore.total;

      // Puntos GENERALES (predicción general): total al cierre de ayer y ganado ayer.
      const generalTotal = scoreBracket(
        myBracket,
        offThroughYesterday,
        tourThroughYesterday,
        teamsById,
      ).total;
      const generalBefore = scoreBracket(
        myBracket,
        offBeforeYesterday,
        tourBeforeYesterday,
        teamsById,
      ).total;
      const generalGain = generalTotal - generalBefore;

      return {
        id: p.id,
        name: p.display_name,
        exactCount: matchThrough.exactCount,
        matchTotal,
        generalTotal,
        total: matchTotal + generalTotal,
        matchGain,
        generalGain,
        gain: matchGain + generalGain,
      };
    })
    .sort(
      (a, b) =>
        b.total - a.total ||
        b.exactCount - a.exactCount ||
        a.name.localeCompare(b.name),
    );

  // Partidos cuyo resultado quedó cargado AYER, para el bloque de resultados.
  const yesterdayResults = matchList
    .filter((m) => {
      const r = resultsThroughYesterday.get(m.id);
      return r && dayOf(r.finalized_at)! === yesterday;
    })
    .map((m) => {
      const r = resultsThroughYesterday.get(m.id)!;
      const home = m.home_team_id ? teamsById.get(m.home_team_id) : null;
      const away = m.away_team_id ? teamsById.get(m.away_team_id) : null;
      const homeName = home?.name ?? m.home_placeholder ?? "?";
      const awayName = away?.name ?? m.away_placeholder ?? "?";
      return `${home?.flag_emoji ?? ""} ${homeName} ${r.home_score_90}–${r.away_score_90} ${awayName} ${away?.flag_emoji ?? ""}`.trim();
    });

  // ===== Texto del mensaje (listo para reenviar) =====
  const dateLabel = DATE_LONG.format(yesterdayDate);
  const medal = (i: number) =>
    i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;

  const lines: string[] = [];
  lines.push("🏆 Polla Mundial 2026");
  lines.push(`📅 Resultados de ayer · ${dateLabel}`);
  lines.push("");
  lines.push("⚽ Partidos de ayer:");
  if (yesterdayResults.length > 0) {
    for (const r of yesterdayResults) lines.push(r);
  } else {
    lines.push("Ayer no se cargaron resultados nuevos.");
  }
  lines.push("");
  lines.push("📊 Tabla (P = por partido · G = general):");
  ranked.forEach((p, i) => {
    // Lo ganado ayer, mostrando SIEMPRE las dos dimensiones (partido y general)
    // cuando hubo algún movimiento, así sea +0 en una de ellas.
    const gainTxt =
      p.gain > 0
        ? `  ▲ ayer P +${fmt(p.matchGain)} · G +${fmt(p.generalGain)}`
        : "";
    lines.push(
      `${medal(i)} ${p.name} — ${fmt(p.total)} (P ${fmt(p.matchTotal)} · G ${fmt(
        p.generalTotal,
      )})${gainTxt}`,
    );
  });
  lines.push("");
  lines.push("P = puntos por partidos · G = puntos de la predicción general.");
  lines.push("▲ ayer = lo que sumó ayer en cada uno. ¡A seguir! 🔥");
  const text = lines.join("\n");
  const subject = `Polla Mundial — Resultados de ayer (${dateLabel})`;

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Resumen diario</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
          Mensaje para enviar <strong>en la mañana</strong>: recapitula los
          resultados y puntos de <strong>ayer</strong> ({yesterday}, hora de
          Colombia). Los totales son los del cierre de ayer, separados en{" "}
          <strong>P</strong> (por partido) y <strong>G</strong> (general). Ábrelo,
          compártelo y reenvíalo por donde quieras.
        </p>
      </header>

      <DailySummaryShare text={text} subject={subject} />

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40">
          <h2 className="font-semibold text-sm">Vista previa</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead className="text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2 text-left w-10">#</th>
                <th className="px-4 py-2 text-left">Participante</th>
                <th
                  className="px-3 py-2 text-right"
                  title="Puntos por partido (al cierre de ayer)"
                >
                  Por partido
                </th>
                <th
                  className="px-3 py-2 text-right"
                  title="Puntos de la predicción general (al cierre de ayer)"
                >
                  General
                </th>
                <th className="px-4 py-2 text-right">Total</th>
                <th
                  className="px-3 py-2 text-right"
                  title="Puntos por partido ganados ayer"
                >
                  +P ayer
                </th>
                <th
                  className="px-3 py-2 text-right"
                  title="Puntos generales ganados ayer"
                >
                  +G ayer
                </th>
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
                  <td className="px-3 py-2 text-right font-mono text-zinc-500">
                    {fmt(p.matchTotal)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-500">
                    {p.generalTotal > 0 ? fmt(p.generalTotal) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-semibold">
                    {fmt(p.total)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                    {p.matchGain > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{fmt(p.matchGain)}
                      </span>
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-700">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                    {p.generalGain > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{fmt(p.generalGain)}
                      </span>
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-700">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
