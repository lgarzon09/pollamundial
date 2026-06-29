import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type {
  BracketPrediction,
  BracketResults,
  Match,
  MatchPrediction,
  MatchResult,
  Settings,
  Team,
  TournamentResults,
} from "@/lib/db/types";
import { STAGE_SHORT } from "@/lib/db/types";
import { TeamLabel } from "@/components/TeamLabel";
import { StageBadge } from "@/components/StageBadge";
import { LocalDate, LocalTime } from "@/components/LocalDateTime";
import { KORoundBlock } from "@/components/KORoundBlock";
import { PredictionsByDay } from "@/components/PredictionsByDay";
import { BracketScoreBreakdown } from "@/components/BracketScoreBreakdown";
import { PointsBadge } from "@/components/PointsBadge";
import {
  bracketPickPoints,
  bracketResultsAsOf,
  scoreBracket,
  scoreMatch,
  totalMatchPoints,
  type PickPoints,
} from "@/lib/scoring";
import { makeSlotResolver, withOfficialMatchTeams } from "@/lib/bracket";
import { fetchAllRows } from "@/lib/db/fetchAll";

export const dynamic = "force-dynamic";

const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

export default async function ResumenPage() {
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
    { data: bracket },
    { data: profiles },
    { data: settings },
    { data: allPredictions },
    { data: myProfile },
    { data: allBrackets },
    { data: official },
    { data: tournament },
  ] = await Promise.all([
    supabase.from("matches").select("*").order("kickoff_at", { ascending: true }),
    supabase.from("match_predictions").select("*").eq("user_id", user.id),
    supabase.from("match_results").select("*"),
    supabase.from("teams").select("*"),
    supabase
      .from("bracket_predictions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("id, display_name, is_admin"),
    supabase
      .from("settings")
      .select("tournament_start_at, match_prediction_cutoff_minutes")
      .eq("id", 1)
      .maybeSingle(),
    // Todas las predicciones, paginadas: la tabla supera las 1000 filas y un
    // select() plano se truncaría, corrompiendo puntos/orden del ranking.
    fetchAllRows<MatchPrediction>((from, to) =>
      supabase
        .from("match_predictions")
        .select("*")
        .order("id", { ascending: true })
        .range(from, to),
    ).then((data) => ({ data })),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("bracket_predictions").select("*"),
    supabase.from("bracket_results").select("*").eq("id", 1).maybeSingle(),
    supabase.from("tournament_results").select("*").eq("id", 1).maybeSingle(),
  ]);

  const teamsById = new Map<string, Team>((teams ?? []).map((t) => [t.id, t]));
  const predictionsByMatch = new Map<number, MatchPrediction>(
    (predictions ?? []).map((p) => [p.match_id, p as MatchPrediction]),
  );
  const resultsByMatch = new Map<number, MatchResult>(
    (results ?? []).map((r) => [r.match_id, r as MatchResult]),
  );

  // Bracket oficial (realidad) + premios oficiales para puntuar la predicción general
  const officialBracket = (official as BracketResults | null) ?? null;
  const tournamentResults = (tournament as TournamentResults | null) ?? null;

  // Rellena los equipos KO ya confirmados por el resultado oficial del torneo.
  const matchList = withOfficialMatchTeams(
    (matches ?? []) as Match[],
    officialBracket,
  );
  const totals = totalMatchPoints(matchList, predictionsByMatch, resultsByMatch);
  const totalPredicted = predictionsByMatch.size;
  const bracketsByUser = new Map<string, BracketPrediction>(
    ((allBrackets ?? []) as BracketPrediction[]).map((b) => [b.user_id, b]),
  );

  // Ranking de todos los participantes
  const predsByUser = new Map<string, Map<number, MatchPrediction>>();
  for (const p of (allPredictions ?? []) as MatchPrediction[]) {
    if (!predsByUser.has(p.user_id)) predsByUser.set(p.user_id, new Map());
    predsByUser.get(p.user_id)!.set(p.match_id, p);
  }
  const rankedProfiles = (profiles ?? [])
    .map((p) => {
      const userPreds = predsByUser.get(p.id) ?? new Map<number, MatchPrediction>();
      const t = totalMatchPoints(matchList, userPreds, resultsByMatch);
      const bracketTotal = scoreBracket(
        bracketsByUser.get(p.id) ?? null,
        officialBracket,
        tournamentResults,
        teamsById,
      ).total;
      return {
        ...p,
        total: t.total,
        exactCount: t.exactCount,
        bracketTotal,
        // El TOTAL (general + por partido) define el puesto en el ranking.
        grandTotal: t.total + bracketTotal,
      };
    })
    .sort(
      (a, b) =>
        b.grandTotal - a.grandTotal ||
        b.exactCount - a.exactCount ||
        a.display_name.localeCompare(b.display_name),
    );

  // Movimiento desde la "última jornada". Una jornada es el día (TZ Bogotá) del
  // evento más reciente que cambió puntajes: el último lote de partidos
  // finalizados (que mueven puntos por partido Y los generales del bracket,
  // anclados al partido) O la entrega de premios. El Δ y el cambio de puesto se
  // calculan SIEMPRE sobre el TOTAL (general + por
  // partido) comparando contra el estado de antes de ese día.
  const BOGOTA_DAY = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // ¿El admin ya cargó resultados oficiales de la predicción general?
  const officialDataReady =
    (!!officialBracket &&
      (Object.keys(officialBracket.group_positions ?? {}).length > 0 ||
        !!officialBracket.champion ||
        Object.keys(officialBracket.r32_winners ?? {}).length > 0)) ||
    (!!tournamentResults &&
      !!(
        tournamentResults.top_scorer ||
        tournamentResults.golden_ball ||
        tournamentResults.golden_glove ||
        tournamentResults.young_player ||
        tournamentResults.revelation_team
      ));

  const finalizedResults = (results ?? []).filter(
    (r) => r.is_finalized && r.finalized_at,
  ) as MatchResult[];
  const matchDayOf = (r: MatchResult) =>
    BOGOTA_DAY.format(new Date(r.finalized_at as string));
  const lastMatchDay =
    finalizedResults.length > 0
      ? [...finalizedResults.map(matchDayOf)].sort().at(-1)!
      : null;

  // Los puntos GENERALES del bracket ya NO dependen de cuándo el admin guardó:
  // cada parte se ancla al partido que la justifica (ver bracketResultsAsOf), así
  // que el general cambia los MISMOS días que finalizan los partidos. Lo único
  // que tiene día propio son los PREMIOS (tournament_results): se entregan una
  // sola vez al final, sin partido que los ancle.
  const awardsReady =
    !!tournamentResults &&
    !!(
      tournamentResults.top_scorer ||
      tournamentResults.golden_ball ||
      tournamentResults.golden_glove ||
      tournamentResults.young_player ||
      tournamentResults.revelation_team
    );
  const awardsDay =
    awardsReady && tournamentResults
      ? BOGOTA_DAY.format(new Date(tournamentResults.updated_at))
      : null;

  // Día del evento más reciente (los strings YYYY-MM-DD ordenan cronológicamente).
  const lastEventDay =
    [lastMatchDay, awardsDay].filter(Boolean).sort().at(-1) ?? null;

  // ¿Los premios ya estaban contados ANTES de esta jornada? (se cargaron un día previo).
  const awardsCountedBefore =
    awardsDay != null && lastEventDay != null && awardsDay < lastEventDay;

  // Resultados de partidos de jornadas anteriores (día < lastEventDay).
  const resultsAnteriores = new Map<number, MatchResult>();
  for (const r of finalizedResults) {
    if (lastEventDay != null && matchDayOf(r) < lastEventDay)
      resultsAnteriores.set(r.match_id, r);
  }

  // Estado del general (bracket) ANTES de esta jornada: bracket oficial recortado
  // a los partidos finalizados antes de lastEventDay + premios sólo si ya aplicaban.
  const offAnteriores = bracketResultsAsOf(
    officialBracket,
    matchList,
    new Set(resultsAnteriores.keys()),
  );
  const tourAnteriores = awardsCountedBefore ? tournamentResults : null;

  // Hay "anterior" si antes de lastEventDay ya había puntos (partidos o general).
  const hasPreviousJornada =
    lastEventDay != null &&
    (resultsAnteriores.size > 0 || awardsCountedBefore);

  const prevPosById = new Map<string, number>();
  const prevPtsById = new Map<string, number>();
  if (hasPreviousJornada) {
    const prevRanked = (profiles ?? [])
      .map((p) => {
        const userPreds =
          predsByUser.get(p.id) ?? new Map<number, MatchPrediction>();
        const t = totalMatchPoints(matchList, userPreds, resultsAnteriores);
        // El general anterior: bracket anclado a los partidos de antes + premios
        // sólo si ya se habían entregado en una jornada previa.
        const bracketTotal = scoreBracket(
          bracketsByUser.get(p.id) ?? null,
          offAnteriores,
          tourAnteriores,
          teamsById,
        ).total;
        return {
          id: p.id,
          display_name: p.display_name,
          exactCount: t.exactCount,
          grandTotal: t.total + bracketTotal,
        };
      })
      .sort(
        (a, b) =>
          b.grandTotal - a.grandTotal ||
          b.exactCount - a.exactCount ||
          a.display_name.localeCompare(b.display_name),
      );
    prevRanked.forEach((p, i) => {
      prevPosById.set(p.id, i + 1);
      prevPtsById.set(p.id, p.grandTotal);
    });
  }

  // Partidos de HOY (en hora de Bogotá): se juegan o ya se jugaron hoy.
  const todayBogota = BOGOTA_DAY.format(new Date());
  const todayMatches = matchList.filter(
    (m) => BOGOTA_DAY.format(new Date(m.kickoff_at)) === todayBogota,
  );

  // Bracket CTA
  const tournamentStart = settings?.tournament_start_at
    ? new Date(settings.tournament_start_at)
    : null;
  const bracketLocked = tournamentStart
    ? tournamentStart.getTime() <= Date.now()
    : false;
  const hasBracketDraft = !!bracket;
  const daysToStart = tournamentStart
    ? Math.max(
        0,
        Math.ceil((tournamentStart.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      )
    : null;

  const myRank = rankedProfiles.findIndex((p) => p.id === user.id) + 1;
  const myEntry = rankedProfiles.find((p) => p.id === user.id);
  const myGrandTotal = myEntry?.grandTotal ?? totals.total;
  const myBracketTotal = myEntry?.bracketTotal ?? 0;
  const br = (bracket as BracketPrediction | null) ?? null;

  const myBracketScore =
    br && officialDataReady
      ? scoreBracket(br, officialBracket, tournamentResults, teamsById)
      : null;
  // Puntos por cada selección del bracket, para mostrarlos al lado de cada pick.
  const pickPts =
    br && officialDataReady
      ? bracketPickPoints(br, officialBracket, tournamentResults)
      : null;
  // Resuelve los emparejamientos KO según el propio bracket del usuario.
  const matchesById = new Map<number, Match>(matchList.map((m) => [m.id, m]));
  const slotResolver = br ? makeSlotResolver(br, matchesById) : undefined;

  // ¿Predicción general "completa"? (12 grupos + R32 + R16 + QF + SF + campeón + 5 premios)
  const countJsonbKeys = (obj: Record<string, string> | undefined) =>
    obj ? Object.values(obj).filter(Boolean).length : 0;
  const r32Picks = countJsonbKeys(br?.r32_winners);
  const r16Picks = countJsonbKeys(br?.r16_winners);
  const qfPicks = countJsonbKeys(br?.qf_winners);
  const sfPicks = countJsonbKeys(br?.sf_winners);
  const bracketComplete =
    !!br &&
    GROUPS.every((g) => {
      const pos = br.group_positions?.[g] ?? [];
      return pos.filter(Boolean).length === 4 && new Set(pos).size === 4;
    }) &&
    r32Picks === 16 &&
    r16Picks === 8 &&
    qfPicks === 4 &&
    sfPicks === 2 &&
    !!br.champion &&
    !!br.top_scorer &&
    !!br.golden_ball &&
    !!br.golden_glove &&
    !!br.young_player &&
    !!br.revelation_team;

  const displayName = myProfile?.display_name ?? user.email ?? "participante";

  // Calcular qué le falta al usuario
  type Missing = { label: string; href: string };
  const missing: Missing[] = [];
  if (!bracketLocked) {
    for (const g of GROUPS) {
      const positions = br?.group_positions?.[g] ?? [];
      const filled = positions.filter(Boolean).length;
      const unique = new Set(positions.filter(Boolean)).size;
      const complete = filled === 4 && unique === 4;
      if (!complete) {
        missing.push({
          label: `Grupo ${g}: ${filled === 0 ? "sin llenar" : `${unique}/4 únicos`}`,
          href: "/predicciones/general",
        });
      }
    }
    if (r32Picks < 16)
      missing.push({
        label: `Ganadores de R32 (${r32Picks}/16 picks)`,
        href: "/predicciones/general",
      });
    if (r16Picks < 8)
      missing.push({
        label: `Ganadores de 8vos (${r16Picks}/8 picks)`,
        href: "/predicciones/general",
      });
    if (qfPicks < 4)
      missing.push({
        label: `Ganadores de 4tos (${qfPicks}/4 picks)`,
        href: "/predicciones/general",
      });
    if (sfPicks < 2)
      missing.push({
        label: `Ganadores de semis (${sfPicks}/2 picks)`,
        href: "/predicciones/general",
      });
    if (!br?.champion)
      missing.push({ label: "Elegir campeón (30 pts)", href: "/predicciones/general" });
    if (!br?.top_scorer)
      missing.push({ label: "Predecir goleador (25 pts)", href: "/predicciones/general" });
    if (!br?.golden_ball)
      missing.push({ label: "Predecir Balón de Oro (15 pts)", href: "/predicciones/general" });
    if (!br?.golden_glove)
      missing.push({ label: "Predecir Guante de Oro (15 pts)", href: "/predicciones/general" });
    if (!br?.young_player)
      missing.push({ label: "Predecir mejor jugador joven (15 pts)", href: "/predicciones/general" });
    if (!br?.revelation_team)
      missing.push({ label: "Predecir equipo revelación (15 pts)", href: "/predicciones/general" });
  }
  // Partidos pendientes: partidos donde YA hay equipos definidos, no están bloqueados,
  // y no tienes predicción. Los KO sin equipos todavía no cuentan como "pendientes"
  // porque no se pueden predecir.
  const cutoffMs = (settings?.match_prediction_cutoff_minutes ?? 10) * 60_000;
  const pendingMatches = matchList.filter((m) => {
    if (!m.home_team_id || !m.away_team_id) return false;
    const lockedAt = new Date(m.kickoff_at).getTime() - cutoffMs;
    return lockedAt > Date.now() && !predictionsByMatch.has(m.id);
  });
  const upcomingPending = pendingMatches.slice(0, 3); // primeros 3 que se aproximan

  return (
    <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-5 sm:space-y-7">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold">
          Hola, {displayName} 👋
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Tu polla del Mundial 2026 — predicciones, ranking y partidos.
        </p>
      </header>

      {/* Lo que te falta */}
      {(missing.length > 0 || pendingMatches.length > 0) && (
        <details
          open
          className="group rounded-xl border border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/60 overflow-hidden"
        >
          <summary className="px-4 sm:px-5 py-3 cursor-pointer flex items-center justify-between hover:bg-amber-100/50 dark:hover:bg-amber-900/30 list-none">
            <h2 className="font-semibold text-amber-900 dark:text-amber-200">
              📝 Lo que te falta
            </h2>
            <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">
              {missing.length + pendingMatches.length} pendiente
              {missing.length + pendingMatches.length === 1 ? "" : "s"}
            </span>
          </summary>
          <div className="px-4 sm:px-5 pb-4 space-y-3 text-sm text-amber-900 dark:text-amber-100">
            {missing.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide font-semibold mb-1.5 opacity-80">
                  En tu predicción general
                </p>
                <ul className="space-y-1">
                  {missing.slice(0, 8).map((m, i) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <span>• {m.label}</span>
                      <Link
                        href={m.href}
                        className="text-xs underline shrink-0 text-amber-800 dark:text-amber-300"
                      >
                        ir
                      </Link>
                    </li>
                  ))}
                  {missing.length > 8 && (
                    <li className="text-xs opacity-70">
                      …y {missing.length - 8} más
                    </li>
                  )}
                </ul>
              </div>
            )}
            {pendingMatches.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide font-semibold mb-1.5 opacity-80">
                  Predicciones por partido pendientes ({pendingMatches.length})
                </p>
                <ul className="space-y-1">
                  {upcomingPending.map((m) => {
                    const home = m.home_team_id
                      ? teamsById.get(m.home_team_id)
                      : null;
                    const away = m.away_team_id
                      ? teamsById.get(m.away_team_id)
                      : null;
                    return (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="truncate">
                          •{" "}
                          {home
                            ? `${home.flag_emoji} ${home.name}`
                            : m.home_placeholder ?? "?"}{" "}
                          vs{" "}
                          {away
                            ? `${away.flag_emoji} ${away.name}`
                            : m.away_placeholder ?? "?"}{" "}
                          <span className="text-xs opacity-70">
                            {<LocalDate iso={m.kickoff_at} />}
                          </span>
                        </span>
                        <Link
                          href="/predicciones/partidos"
                          className="text-xs underline shrink-0 text-amber-800 dark:text-amber-300"
                        >
                          predecir
                        </Link>
                      </li>
                    );
                  })}
                  {pendingMatches.length > upcomingPending.length && (
                    <li>
                      <Link
                        href="/predicciones/partidos"
                        className="text-xs underline text-amber-800 dark:text-amber-300"
                      >
                        Ver los {pendingMatches.length} pendientes →
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}

      {/* CTA Predicción general (sólo si no está completa y aún no cierra) */}
      {!bracketLocked && !bracketComplete && (
        <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-emerald-900 dark:text-emerald-200">
              🏆{" "}
              {hasBracketDraft
                ? "Sigue editando tu predicción general"
                : "Llena tu predicción general"}
              {daysToStart !== null && daysToStart > 0
                ? ` · faltan ${daysToStart} día${daysToStart === 1 ? "" : "s"} para el cierre`
                : daysToStart === 0
                  ? " · cierra hoy"
                  : ""}
            </p>
            <p className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">
              Te falta llenar grupos o elegir campeón. Editable hasta el inicio
              del Mundial.
            </p>
          </div>
          <Link
            href="/predicciones/general"
            className="inline-flex items-center justify-center rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 text-sm whitespace-nowrap w-full sm:w-auto"
          >
            {hasBracketDraft ? "Continuar →" : "Llenar ahora →"}
          </Link>
        </div>
      )}

      {/* Totales del usuario */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label="Tu posición"
          value={myRank > 0 ? myRank : 0}
          sub={`de ${rankedProfiles.length} participantes`}
          highlight
        />
        <Stat
          label="Tus puntos (total)"
          value={myGrandTotal}
          sub={`${totals.total} por partido · ${myBracketTotal} general`}
          highlight
        />
        <Stat
          label="Marcadores exactos acertados"
          value={totals.exactCount}
        />
        <Stat
          label="Predicciones hechas"
          value={totalPredicted}
          sub={`de ${matchList.length} partidos`}
        />
      </section>

      {/* Puntos partido a partido (encima del ranking) */}
      <Link
        href="/auditoria"
        className="group flex items-center justify-between gap-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 px-4 sm:px-5 py-4 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl shrink-0" aria-hidden>
            🔎
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-emerald-900 dark:text-emerald-200">
              Puntos partido a partido
            </p>
            <p className="text-sm text-emerald-800 dark:text-emerald-300 truncate">
              Mira cuántos puntos ganó cada quien en cada partido. Verifica de
              dónde sale el puntaje.
            </p>
          </div>
        </div>
        <span
          className="text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:translate-x-0.5 transition-transform"
          aria-hidden
        >
          →
        </span>
      </Link>

      {/* Auditoría de cambios */}
      <Link
        href="/auditoria/cambios"
        className="group flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 sm:px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl shrink-0" aria-hidden>
            🕒
          </span>
          <div className="min-w-0">
            <p className="font-semibold">Auditoría de cambios</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
              Cuándo creó o editó cada quien sus predicciones (hora local) y la
              hora del partido. Por transparencia.
            </p>
          </div>
        </div>
        <span
          className="text-zinc-400 shrink-0 group-hover:translate-x-0.5 transition-transform"
          aria-hidden
        >
          →
        </span>
      </Link>

      {/* Ranking */}
      <details
        open
        className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
      >
        <summary className="px-4 sm:px-5 py-3 cursor-pointer flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40 list-none">
          <h2 className="font-semibold">Ranking</h2>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/participantes"
              className="text-emerald-600 hover:underline"
            >
              Ver todos
            </Link>
            <span
              className="text-zinc-400 group-open:rotate-180 transition-transform"
              aria-hidden
            >
              ▾
            </span>
          </div>
        </summary>
        {rankedProfiles.length === 0 ? (
          <p className="px-5 py-6 text-sm text-zinc-500">
            Aún no hay participantes. Comparte el link con tus amigos.
          </p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-zinc-50 dark:bg-zinc-950/40 text-zinc-600 dark:text-zinc-400">
              <tr>
                <th className="px-5 py-2 text-left w-12">#</th>
                <th className="px-5 py-2 text-left">Participante</th>
                <th
                  className="px-5 py-2 text-right"
                  title="Total = General + Por partido. Define el puesto en el ranking."
                >
                  Total
                </th>
                <th
                  className="px-3 py-2 text-right"
                  title="Puntos de la predicción general (bracket). El detalle se ve en cada perfil."
                >
                  General
                </th>
                <th
                  className="px-3 py-2 text-right"
                  title="Puntos de las predicciones por partido"
                >
                  Por partido
                </th>
                <th
                  className="px-3 py-2 text-right"
                  title="Cambio de posición desde la última jornada"
                >
                  Puestos
                </th>
                <th
                  className="px-3 py-2 text-right"
                  title="Puntos ganados desde la última jornada"
                >
                  Δ pts
                </th>
                <th
                  className="px-5 py-2 text-right"
                  title="Marcadores exactos acertados (usado para desempate)"
                >
                  Marcadores exactos
                </th>
              </tr>
            </thead>
            <tbody>
              {rankedProfiles.map((p, i) => (
                <tr
                  key={p.id}
                  className={`border-t border-zinc-100 dark:border-zinc-800 ${
                    user.id === p.id ? "bg-emerald-50/50 dark:bg-emerald-950/30" : ""
                  }`}
                >
                  <td className="px-5 py-2 text-zinc-500">{i + 1}</td>
                  <td className="px-5 py-2">
                    <Link
                      href={`/participantes/${p.id}`}
                      className="font-medium hover:text-emerald-600"
                    >
                      {p.display_name}
                    </Link>
                    {user.id === p.id && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold">
                        tú
                      </span>
                    )}
                    {p.is_admin && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                        admin
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-2 text-right font-mono font-semibold">
                    {p.grandTotal.toString().replace(/\.0$/, "")}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-500">
                    {p.bracketTotal > 0
                      ? p.bracketTotal.toString().replace(/\.0$/, "")
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-500">
                    {p.total.toString().replace(/\.0$/, "")}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <PositionDelta
                      deltaPos={
                        prevPosById.has(p.id)
                          ? prevPosById.get(p.id)! - (i + 1)
                          : null
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <PointsDelta
                      deltaPts={
                        prevPtsById.has(p.id)
                          ? p.grandTotal - prevPtsById.get(p.id)!
                          : null
                      }
                    />
                  </td>
                  <td className="px-5 py-2 text-right font-mono text-zinc-500">
                    {p.exactCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </details>

      {/* Partidos de hoy — misma experiencia que la lista por partido:
          editar tu marcador, ver el desglose de puntos y las predicciones de todos. */}
      <details
        open
        className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
      >
        <summary className="px-4 sm:px-5 py-3 cursor-pointer flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40 list-none">
          <h2 className="font-semibold">Partidos de hoy</h2>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-xs text-zinc-500">
              {todayMatches.length} partido{todayMatches.length === 1 ? "" : "s"}
            </span>
            <span
              className="text-zinc-400 group-open:rotate-180 transition-transform"
              aria-hidden
            >
              ▾
            </span>
          </div>
        </summary>
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          <PredictionsByDay
            variant="flat"
            matches={todayMatches}
            teams={(teams ?? []) as Team[]}
            predictions={(predictions ?? []) as MatchPrediction[]}
            results={(results ?? []) as MatchResult[]}
            settings={(settings as unknown as Settings) ?? null}
            readOnly={false}
            ownerLabel="tu predicción"
            allPredictions={(allPredictions ?? []) as MatchPrediction[]}
            profiles={(profiles ?? []) as { id: string; display_name: string }[]}
            emptyLabel="No hay partidos hoy."
          />
        </div>
      </details>

      {/* Lista de predicciones de partidos */}
      <details className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <summary className="px-4 sm:px-5 py-3 cursor-pointer flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40 list-none gap-3">
          <h2 className="font-semibold flex-1">Mis predicciones por partido</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">
              {predictionsByMatch.size}/{matchList.length}
            </span>
            <span
              className="text-zinc-400 group-open:rotate-180 transition-transform"
              aria-hidden
            >
              ▾
            </span>
          </div>
        </summary>
        <div className="px-4 sm:px-5 py-2 border-t border-zinc-100 dark:border-zinc-800 text-right">
          <Link
            href="/predicciones/partidos"
            className="text-sm text-emerald-600 hover:underline"
          >
            Editar predicciones →
          </Link>
        </div>
        {matchList.length === 0 ? (
          <p className="px-5 py-6 text-sm text-zinc-500">No hay partidos cargados.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {matchList.map((m) => {
              const p = predictionsByMatch.get(m.id) ?? null;
              const r = resultsByMatch.get(m.id) ?? null;
              const home = m.home_team_id ? teamsById.get(m.home_team_id) : null;
              const away = m.away_team_id ? teamsById.get(m.away_team_id) : null;
              const score = p && r?.is_finalized ? scoreMatch(m, p, r) : null;
              const expandable = !!score;
              return (
                <li key={m.id}>
                  <details className="group" {...(expandable ? {} : { open: false })}>
                    <summary
                      className={`px-5 py-2.5 grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-3 text-sm list-none ${
                        expandable
                          ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                          : "cursor-default"
                      }`}
                    >
                      <span className="text-[10px] uppercase tracking-wide text-zinc-500 w-12">
                        {STAGE_SHORT[m.stage]}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate">
                          <span className="text-base mr-1">{home?.flag_emoji ?? "·"}</span>
                          {home?.name ?? m.home_placeholder ?? "?"}
                          <span className="text-zinc-400 mx-1.5">vs</span>
                          <span className="text-base mr-1">{away?.flag_emoji ?? "·"}</span>
                          {away?.name ?? m.away_placeholder ?? "?"}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {<LocalDate iso={m.kickoff_at} />} ·{" "}
                          {<LocalTime iso={m.kickoff_at} />}
                        </div>
                      </div>
                      <div className="text-right">
                        {p ? (
                          <span className="font-mono font-semibold">
                            {p.home_score_90}–{p.away_score_90}
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-xs">—</span>
                        )}
                        {r?.is_finalized && (
                          <div className="text-[10px] text-zinc-500 font-mono">
                            oficial: {r.home_score_90}–{r.away_score_90}
                          </div>
                        )}
                      </div>
                      <div className="text-right w-14">
                        {score ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono font-semibold text-xs ${
                              score.total > 0
                                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                            }`}
                          >
                            {score.total > 0 ? "+" : ""}
                            {score.total.toString().replace(/\.0$/, "")}
                          </span>
                        ) : (
                          <span className="text-zinc-300 text-xs">—</span>
                        )}
                      </div>
                      <span
                        className={`flex items-center gap-1 text-sm transition-transform ${
                          expandable
                            ? "text-emerald-500 group-open:rotate-180"
                            : "invisible"
                        }`}
                        aria-hidden
                      >
                        ▾
                      </span>
                    </summary>
                    {score && (
                      <div className="px-4 sm:px-5 pb-3 -mt-1">
                        <ul className="text-xs rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
                          {score.lines.map((l) => (
                            <li
                              key={l.label}
                              className={`flex items-center justify-between gap-3 px-3 py-1.5 ${
                                l.correct
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-zinc-500 dark:text-zinc-500"
                              }`}
                            >
                              <span className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span aria-hidden>{l.correct ? "✓" : "·"}</span>
                                <span className="truncate">{l.label}</span>
                                {l.detail && (
                                  <span className="text-zinc-400 dark:text-zinc-500 ml-1 truncate">
                                    ({l.detail})
                                  </span>
                                )}
                              </span>
                              <span className="font-mono shrink-0">
                                {l.points > 0
                                  ? `+${l.points.toString().replace(/\.0$/, "")}`
                                  : "0"}
                              </span>
                            </li>
                          ))}
                          <li className="flex items-center justify-between gap-3 px-3 py-2 font-semibold bg-zinc-200/60 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-b-lg">
                            <span>Total del partido</span>
                            <span className="font-mono text-emerald-700 dark:text-emerald-400">
                              +{score.total.toString().replace(/\.0$/, "")}
                            </span>
                          </li>
                        </ul>
                      </div>
                    )}
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </details>

      {/* Mi predicción general (bracket) */}
      <details className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <summary className="px-4 sm:px-5 py-3 cursor-pointer flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40 list-none gap-3">
          <h2 className="font-semibold flex-1">Mi predicción general</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">
              {bracketComplete ? "✓ completa" : br ? "borrador" : "vacía"}
            </span>
            <span
              className="text-zinc-400 group-open:rotate-180 transition-transform"
              aria-hidden
            >
              ▾
            </span>
          </div>
        </summary>
        <div className="px-4 sm:px-5 py-2 border-t border-zinc-100 dark:border-zinc-800 text-right">
          <Link
            href="/predicciones/general"
            className="text-sm text-emerald-600 hover:underline"
          >
            {br ? "Editar" : "Llenar"} predicción general →
          </Link>
        </div>
        {!br ? (
          <p className="px-5 py-6 text-sm text-zinc-500">
            Todavía no has empezado tu predicción general.{" "}
            <Link href="/predicciones/general" className="text-emerald-600 hover:underline">
              Empezar ahora →
            </Link>
          </p>
        ) : (
          <div className="p-5 space-y-5">
            {myBracketScore && (
              <BracketScoreBreakdown
                score={myBracketScore}
                title="Puntos de tu predicción general"
                hint="Suma a medida que el admin carga el resultado real del torneo. Es la columna 'General' del ranking; toca cada línea para ver qué equipos te dan los puntos."
              />
            )}
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                Última actualización
              </p>
              <p className="text-sm">
                <span suppressHydrationWarning>
                  {new Date(br.updated_at).toLocaleString("es-CO")}
                </span>{" "}
                <span className="text-zinc-500">
                  · editable hasta el inicio del Mundial
                </span>
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2">
                Posiciones de grupos
              </p>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                {GROUPS.map((g) => {
                  const positions = br.group_positions?.[g] ?? [];
                  const complete =
                    positions.filter(Boolean).length === 4 &&
                    new Set(positions).size === 4;
                  return (
                    <div
                      key={g}
                      className="rounded border border-zinc-200 dark:border-zinc-800 p-2.5"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs">Grupo {g}</span>
                        {complete ? (
                          <span className="text-[10px] text-emerald-600 font-semibold uppercase">
                            ✓ completo
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-600 font-semibold uppercase">
                            incompleto
                          </span>
                        )}
                      </div>
                      <ol className="text-xs space-y-0.5">
                        {[0, 1, 2, 3].map((i) => {
                          const t = positions[i] ? teamsById.get(positions[i]) : null;
                          return (
                            <li key={i} className="flex items-center gap-1.5">
                              <span className="text-zinc-400 w-5">{i + 1}°</span>
                              {t ? (
                                <span>
                                  {t.flag_emoji} {t.name}
                                  <PointsBadge pick={pickPts?.groupPositions[g]?.[i]} />
                                </span>
                              ) : (
                                <span className="text-zinc-400 italic">—</span>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  );
                })}
              </div>
            </div>

            <KORoundBlock
              title="16vos"
              matches={matchList.filter((m) => m.stage === "r32")}
              winners={br.r32_winners ?? {}}
              teamsById={teamsById}
              points={pickPts?.koWinners}
              resolve={slotResolver}
            />
            <KORoundBlock
              title="Octavos de final"
              matches={matchList.filter((m) => m.stage === "r16")}
              winners={br.r16_winners ?? {}}
              teamsById={teamsById}
              points={pickPts?.koWinners}
              resolve={slotResolver}
            />
            <KORoundBlock
              title="Cuartos de final"
              matches={matchList.filter((m) => m.stage === "qf")}
              winners={br.qf_winners ?? {}}
              teamsById={teamsById}
              points={pickPts?.koWinners}
              resolve={slotResolver}
            />
            <KORoundBlock
              title="Semifinales"
              matches={matchList.filter((m) => m.stage === "sf")}
              winners={br.sf_winners ?? {}}
              teamsById={teamsById}
              points={pickPts?.koWinners}
              resolve={slotResolver}
            />

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <BracketRow
                label="Campeón"
                team={br.champion ? teamsById.get(br.champion) : null}
                points="30 pts"
                earned={pickPts?.champion}
              />
              <BracketRow
                label="Equipo revelación"
                team={br.revelation_team ? teamsById.get(br.revelation_team) : null}
                points="15 pts"
                earned={pickPts?.revelationTeam}
              />
              <BracketText label="Goleador" value={br.top_scorer} points="25 pts" earned={pickPts?.topScorer} />
              <BracketText label="Balón de Oro" value={br.golden_ball} points="15 pts" earned={pickPts?.goldenBall} />
              <BracketText label="Guante de Oro" value={br.golden_glove} points="15 pts" earned={pickPts?.goldenGlove} />
              <BracketText label="Mejor jugador joven" value={br.young_player} points="15 pts" earned={pickPts?.youngPlayer} />
            </div>
          </div>
        )}
      </details>
    </main>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 border ${
        highlight
          ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950"
          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
      }`}
    >
      <div
        className={`text-2xl font-bold font-mono ${
          highlight ? "text-emerald-700 dark:text-emerald-300" : ""
        }`}
      >
        {value}
      </div>
      <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mt-1">
        {label}
      </div>
      {sub && <div className="text-xs text-zinc-400">{sub}</div>}
    </div>
  );
}

function PositionDelta({ deltaPos }: { deltaPos: number | null }) {
  if (deltaPos === null) {
    return <span className="text-xs text-zinc-300 dark:text-zinc-700">—</span>;
  }
  if (deltaPos > 0) {
    return (
      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        ▲{deltaPos}
      </span>
    );
  }
  if (deltaPos < 0) {
    return (
      <span className="text-xs font-semibold text-red-600 dark:text-red-400">
        ▼{Math.abs(deltaPos)}
      </span>
    );
  }
  return <span className="text-xs text-zinc-400">=</span>;
}

function PointsDelta({ deltaPts }: { deltaPts: number | null }) {
  if (deltaPts === null || deltaPts <= 0) {
    return <span className="text-xs text-zinc-300 dark:text-zinc-700">—</span>;
  }
  return (
    <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
      +{deltaPts.toString().replace(/\.0$/, "")}
    </span>
  );
}

function BracketRow({
  label,
  team,
  points,
  earned,
}: {
  label: string;
  team: Team | null | undefined;
  points: string;
  earned?: PickPoints;
}) {
  return (
    <div className="flex items-center justify-between border-b border-dotted border-zinc-200 dark:border-zinc-800 pb-1.5">
      <span className="text-zinc-500">{label}</span>
      <span>
        {team ? (
          <>
            {team.flag_emoji} <strong>{team.name}</strong>
            <PointsBadge pick={earned} />
          </>
        ) : (
          <span className="text-zinc-400 italic">— ({points})</span>
        )}
      </span>
    </div>
  );
}

function BracketText({
  label,
  value,
  points,
  earned,
}: {
  label: string;
  value: string | null;
  points: string;
  earned?: PickPoints;
}) {
  return (
    <div className="flex items-center justify-between border-b border-dotted border-zinc-200 dark:border-zinc-800 pb-1.5">
      <span className="text-zinc-500">{label}</span>
      <span>
        {value ? (
          <>
            <strong>{value}</strong>
            <PointsBadge pick={earned} />
          </>
        ) : (
          <span className="text-zinc-400 italic">— ({points})</span>
        )}
      </span>
    </div>
  );
}

function PartidosCard({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {hasChildren ? (
          children
        ) : (
          <p className="px-5 py-6 text-sm text-zinc-500">{empty}</p>
        )}
      </div>
    </div>
  );
}

function MatchRow({
  match,
  teamsById,
  result,
}: {
  match: Match;
  teamsById: Map<string, Team>;
  result: MatchResult | null;
}) {
  const home = match.home_team_id ? teamsById.get(match.home_team_id) : null;
  const away = match.away_team_id ? teamsById.get(match.away_team_id) : null;
  return (
    <div className="px-5 py-3 flex items-center gap-3 text-sm">
      <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <StageBadge stage={match.stage} groupCode={match.group_code} />
          <span className="text-xs text-zinc-500">
            {<LocalDate iso={match.kickoff_at} />} ·{" "}
            {<LocalTime iso={match.kickoff_at} />}
          </span>
        </div>
        <div className="flex items-center gap-2 truncate">
          <TeamLabel team={home} placeholder={match.home_placeholder} size="sm" />
          <span className="text-zinc-400">vs</span>
          <TeamLabel team={away} placeholder={match.away_placeholder} size="sm" />
        </div>
      </div>
      {result ? (
        <div className="text-right font-mono text-base font-semibold">
          {result.home_score_90}–{result.away_score_90}
          {result.went_to_penalties && (
            <span className="block text-[10px] text-zinc-500 font-normal">
              pen.
            </span>
          )}
        </div>
      ) : (
        <div className="text-right text-xs text-zinc-400 font-mono">—</div>
      )}
    </div>
  );
}
