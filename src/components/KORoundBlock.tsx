import type { Match, Team } from "@/lib/db/types";
import type { PickPoints } from "@/lib/scoring";
import type { SlotResolver } from "@/lib/bracket";
import { PointsBadge } from "./PointsBadge";

export function KORoundBlock({
  title,
  matches,
  winners,
  teamsById,
  points,
  resolve,
}: {
  title: string;
  matches: Match[];
  winners: Record<string, string>;
  teamsById: Map<string, Team>;
  /** Puntos+razones por match_id del pick ganador (opcional, sólo con resultado oficial). */
  points?: Record<string, PickPoints>;
  /** Resuelve qué equipo concreto ocupa cada lado del partido según el bracket. */
  resolve?: SlotResolver;
}) {
  if (matches.length === 0) return null;
  const ordered = [...matches].sort((a, b) => a.id - b.id);
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2">
        {title}
      </p>
      <ul className="grid sm:grid-cols-2 gap-1.5 text-sm">
        {ordered.map((m) => {
          const winnerId = winners[m.id.toString()];
          const homeId = resolve ? resolve(m.id, m.home_placeholder) : null;
          const awayId = resolve ? resolve(m.id, m.away_placeholder) : null;
          const pick = points?.[m.id.toString()];
          const earned = !!pick && pick.total > 0; // tu pick ganador SÍ sumó
          const resolved = !!(homeId || awayId);

          return (
            <li
              key={m.id}
              className="rounded border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5"
            >
              {/* Contexto del slot del bracket (siempre) */}
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                M{m.id}: {m.home_placeholder} vs {m.away_placeholder}
              </div>

              {resolved ? (
                <>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <TeamSide
                      teamId={homeId}
                      teamsById={teamsById}
                      isPick={!!winnerId && winnerId === homeId}
                      earned={earned && winnerId === homeId}
                    />
                    <span className="text-zinc-400 text-xs">vs</span>
                    <TeamSide
                      teamId={awayId}
                      teamsById={teamsById}
                      isPick={!!winnerId && winnerId === awayId}
                      earned={earned && winnerId === awayId}
                    />
                  </div>
                  {/* Puntos ganados por el pick (cuando sumó) */}
                  {earned && (
                    <div className="mt-0.5">
                      <PointsBadge pick={pick} />
                    </div>
                  )}
                </>
              ) : (
                // Sin bracket resuelto: sólo el equipo elegido como ganador.
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="whitespace-nowrap">
                    {winnerId ? (
                      <PickName
                        team={teamsById.get(winnerId)}
                        isPick
                        earned={earned}
                      />
                    ) : (
                      <span className="text-zinc-400 italic text-xs">sin pick</span>
                    )}
                  </span>
                  {earned && <PointsBadge pick={pick} />}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TeamSide({
  teamId,
  teamsById,
  isPick,
  earned,
}: {
  teamId: string | null;
  teamsById: Map<string, Team>;
  isPick: boolean;
  earned: boolean;
}) {
  const team = teamId ? teamsById.get(teamId) : null;
  return <PickName team={team} isPick={isPick} earned={earned} />;
}

/**
 * Diferencia visual:
 * - "ganó puntos" → texto verde con ✓ (sólo cuando el pick realmente sumó)
 * - "el que elegí" (sin sumar aún) → texto en negrita + etiqueta "tu pick", sin verde
 * - el otro equipo → atenuado
 */
function PickName({
  team,
  isPick,
  earned,
}: {
  team: Team | null | undefined;
  isPick: boolean;
  earned: boolean;
}) {
  const name = team ? (
    <>
      {team.flag_emoji} {team.name}
    </>
  ) : (
    <span className="italic text-xs text-zinc-400">?</span>
  );

  if (earned) {
    return (
      <span className="font-semibold text-emerald-700 dark:text-emerald-300">
        <span className="mr-0.5">✓</span>
        {name}
      </span>
    );
  }
  if (isPick) {
    return (
      <span className="inline-flex items-baseline gap-1">
        <span className="font-semibold text-zinc-800 dark:text-zinc-100">
          {name}
        </span>
        <span className="text-[9px] uppercase tracking-wide rounded px-1 py-px border border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
          tu pick
        </span>
      </span>
    );
  }
  return <span className="text-zinc-500 dark:text-zinc-400">{name}</span>;
}
