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
  /** Puntos+razones por match_id del pick (opcional, sólo con resultado oficial). */
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
                      isWinner={!!winnerId && winnerId === homeId}
                    />
                    <span className="text-zinc-400 text-xs">vs</span>
                    <TeamSide
                      teamId={awayId}
                      teamsById={teamsById}
                      isWinner={!!winnerId && winnerId === awayId}
                    />
                  </div>
                  {/* Si el ganador elegido no es ninguno de los lados resueltos */}
                  {winnerId &&
                    winnerId !== homeId &&
                    winnerId !== awayId &&
                    (() => {
                      const w = teamsById.get(winnerId);
                      return (
                        <div className="text-xs mt-0.5">
                          <span className="text-zinc-400">tu pick: </span>
                          <span className="font-medium">
                            {w ? `${w.flag_emoji} ${w.name}` : "?"}
                          </span>
                          <PointsBadge pick={pick} />
                        </div>
                      );
                    })()}
                  {/* Razón/puntos cuando el pick sí es uno de los lados */}
                  {pick && (winnerId === homeId || winnerId === awayId) && (
                    <div className="mt-0.5">
                      <PointsBadge pick={pick} />
                    </div>
                  )}
                </>
              ) : (
                // Sin bracket resuelto: comportamiento simple (sólo el pick).
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="font-medium whitespace-nowrap">
                    {winnerId ? (
                      (() => {
                        const w = teamsById.get(winnerId);
                        return w ? `${w.flag_emoji} ${w.name}` : "?";
                      })()
                    ) : (
                      <span className="text-zinc-400 italic text-xs">sin pick</span>
                    )}
                  </span>
                  <PointsBadge pick={pick} />
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
  isWinner,
}: {
  teamId: string | null;
  teamsById: Map<string, Team>;
  isWinner: boolean;
}) {
  const team = teamId ? teamsById.get(teamId) : null;
  return (
    <span
      className={
        isWinner
          ? "font-semibold text-emerald-700 dark:text-emerald-300"
          : "text-zinc-500 dark:text-zinc-400"
      }
    >
      {isWinner && <span className="mr-0.5">✓</span>}
      {team ? (
        <>
          {team.flag_emoji} {team.name}
        </>
      ) : (
        <span className="italic text-xs text-zinc-400">?</span>
      )}
    </span>
  );
}
