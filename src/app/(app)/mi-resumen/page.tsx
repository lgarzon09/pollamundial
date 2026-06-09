import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type {
  BracketPrediction,
  Match,
  MatchPrediction,
  MatchResult,
  Team,
} from "@/lib/db/types";
import { STAGE_SHORT } from "@/lib/db/types";
import { TeamLabel } from "@/components/TeamLabel";
import { StageBadge } from "@/components/StageBadge";
import { LocalDate, LocalTime } from "@/components/LocalDateTime";
import { scoreMatch, totalMatchPoints } from "@/lib/scoring";

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
    supabase.from("match_predictions").select("*"),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const teamsById = new Map<string, Team>((teams ?? []).map((t) => [t.id, t]));
  const predictionsByMatch = new Map<number, MatchPrediction>(
    (predictions ?? []).map((p) => [p.match_id, p as MatchPrediction]),
  );
  const resultsByMatch = new Map<number, MatchResult>(
    (results ?? []).map((r) => [r.match_id, r as MatchResult]),
  );

  const matchList = (matches ?? []) as Match[];
  const totals = totalMatchPoints(matchList, predictionsByMatch, resultsByMatch);
  const totalPredicted = predictionsByMatch.size;

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
      return { ...p, total: t.total, exactCount: t.exactCount };
    })
    .sort(
      (a, b) =>
        b.total - a.total ||
        b.exactCount - a.exactCount ||
        a.display_name.localeCompare(b.display_name),
    );

  // Próximos y recientes
  const now = Date.now();
  const upcoming = matchList
    .filter((m) => new Date(m.kickoff_at).getTime() > now && !resultsByMatch.has(m.id))
    .slice(0, 5);
  const recent = matchList
    .filter((m) => resultsByMatch.has(m.id))
    .sort((a, b) => new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime())
    .slice(0, 5);

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
  const br = (bracket as BracketPrediction | null) ?? null;

  // ¿Predicción general "completa"? (12 grupos + campeón)
  const bracketComplete =
    !!br &&
    GROUPS.every((g) => {
      const pos = br.group_positions?.[g] ?? [];
      return pos.filter(Boolean).length === 4 && new Set(pos).size === 4;
    }) &&
    !!br.champion;

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
  // Partidos pendientes: cualquier partido NO bloqueado donde NO tienes predicción
  const cutoffMs = (settings?.match_prediction_cutoff_minutes ?? 10) * 60_000;
  const pendingMatches = matchList.filter((m) => {
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
        <Stat label="Tus puntos" value={totals.total} highlight />
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
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-950/40 text-zinc-600 dark:text-zinc-400">
              <tr>
                <th className="px-5 py-2 text-left w-12">#</th>
                <th className="px-5 py-2 text-left">Participante</th>
                <th className="px-5 py-2 text-right">Puntos</th>
                <th
                  className="px-5 py-2 text-right hidden sm:table-cell"
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
                    {p.total.toString().replace(/\.0$/, "")}
                  </td>
                  <td className="px-5 py-2 text-right font-mono hidden sm:table-cell text-zinc-500">
                    {p.exactCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </details>

      {/* Próximos partidos */}
      <details
        open
        className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
      >
        <summary className="px-4 sm:px-5 py-3 cursor-pointer flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40 list-none">
          <h2 className="font-semibold">Próximos partidos</h2>
          <span
            className="text-zinc-400 group-open:rotate-180 transition-transform"
            aria-hidden
          >
            ▾
          </span>
        </summary>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {upcoming.length === 0 ? (
            <p className="px-4 sm:px-5 py-6 text-sm text-zinc-500">
              No hay partidos próximos.
            </p>
          ) : (
            upcoming.map((m) => (
              <MatchRow key={m.id} match={m} teamsById={teamsById} result={null} />
            ))
          )}
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
                      <div className="text-right w-12">
                        {score ? (
                          <span
                            className={`font-mono font-semibold ${
                              score.total > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-zinc-500"
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
                        className={`text-zinc-400 transition-transform ${
                          expandable
                            ? "group-open:rotate-180"
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

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <BracketRow
                label="Campeón"
                team={br.champion ? teamsById.get(br.champion) : null}
                points="30 pts"
              />
              <BracketRow
                label="Equipo revelación"
                team={br.revelation_team ? teamsById.get(br.revelation_team) : null}
                points="15 pts"
              />
              <BracketText label="Goleador" value={br.top_scorer} points="25 pts" />
              <BracketText label="Balón de Oro" value={br.golden_ball} points="15 pts" />
              <BracketText label="Guante de Oro" value={br.golden_glove} points="15 pts" />
              <BracketText label="Mejor jugador joven" value={br.young_player} points="15 pts" />
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

function BracketRow({
  label,
  team,
  points,
}: {
  label: string;
  team: Team | null | undefined;
  points: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-dotted border-zinc-200 dark:border-zinc-800 pb-1.5">
      <span className="text-zinc-500">{label}</span>
      <span>
        {team ? (
          <>
            {team.flag_emoji} <strong>{team.name}</strong>
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
}: {
  label: string;
  value: string | null;
  points: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-dotted border-zinc-200 dark:border-zinc-800 pb-1.5">
      <span className="text-zinc-500">{label}</span>
      <span>
        {value ? (
          <strong>{value}</strong>
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
