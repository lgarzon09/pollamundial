import type { Match, Team } from "@/lib/db/types";
import { PointsBadge } from "./PointsBadge";

export function KORoundBlock({
  title,
  matches,
  winners,
  teamsById,
  points,
}: {
  title: string;
  matches: Match[];
  winners: Record<string, string>;
  teamsById: Map<string, Team>;
  /** Puntos por match_id del pick (opcional, sólo cuando hay resultado oficial). */
  points?: Record<string, number>;
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
          const teamId = winners[m.id.toString()];
          const team = teamId ? teamsById.get(teamId) : null;
          const earned = points?.[m.id.toString()];
          return (
            <li
              key={m.id}
              className="flex items-center justify-between gap-2 rounded border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5"
            >
              <span className="text-xs text-zinc-500 truncate min-w-0 flex-1">
                M{m.id}: {m.home_placeholder} vs {m.away_placeholder}
              </span>
              <span className="font-medium whitespace-nowrap">
                {team ? (
                  <>
                    {team.flag_emoji} {team.name}
                    <PointsBadge points={earned} />
                  </>
                ) : (
                  <span className="text-zinc-400 italic text-xs">sin pick</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
