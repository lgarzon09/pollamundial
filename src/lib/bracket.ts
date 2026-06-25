// Resolución de los slots del bracket (qué equipo concreto ocupa cada lado de
// un partido KO), según la predicción del usuario. Espejo de la lógica de
// resolveSlotTeam() en BracketForm.tsx, pero pura para usar en server.
import type { BracketResults, Match } from "./db/types";
import type { BracketShape } from "./scoring";

export type SlotResolver = (
  matchId: number,
  placeholder: string | null | undefined,
) => string | null;

export function makeSlotResolver(
  b: BracketShape,
  matchesById: Map<number, Match>,
): SlotResolver {
  return function resolve(matchId, placeholder) {
    if (!placeholder) return null;

    // "1°/2°/3°/4° Grupo X"
    const groupMatch = placeholder.match(/^([1-4])°\s+Grupo\s+([A-L])$/);
    if (groupMatch) {
      const pos = parseInt(groupMatch[1], 10) - 1;
      return b.group_positions?.[groupMatch[2]]?.[pos] || null;
    }

    // "3° X/Y/Z/..." — el equipo viene de la asignación de 3° lugares.
    if (/^3°\s+([A-L/]+)$/.test(placeholder)) {
      return b.r32_third_place_assignments?.[matchId.toString()] || null;
    }

    // "Ganador M##" — el ganador que el usuario eligió en ese partido fuente.
    const winnerMatch = placeholder.match(/^Ganador M(\d+)$/);
    if (winnerMatch) {
      const sid = winnerMatch[1];
      const src = matchesById.get(parseInt(sid, 10));
      if (!src) return null;
      const map =
        src.stage === "r32"
          ? b.r32_winners
          : src.stage === "r16"
            ? b.r16_winners
            : src.stage === "qf"
              ? b.qf_winners
              : src.stage === "sf"
                ? b.sf_winners
                : null;
      return map?.[sid] || null;
    }

    return null;
  };
}

/**
 * Rellena los equipos de los partidos KO con los que YA están confirmados por el
 * resultado OFICIAL del torneo (bracket_results): 1°/2° de grupo y 3° asignados
 * para R32, ganadores reales para rondas siguientes. No toca partidos de grupos
 * ni los que ya tienen equipo asignado. Devuelve copias sólo de los que cambian.
 */
export function withOfficialMatchTeams(
  matches: Match[],
  official: BracketResults | null,
): Match[] {
  if (!official) return matches;
  const byId = new Map(matches.map((m) => [m.id, m]));
  const resolve = makeSlotResolver(official, byId);
  return matches.map((m) => {
    if (m.stage === "group") return m;
    const home = m.home_team_id ?? resolve(m.id, m.home_placeholder);
    const away = m.away_team_id ?? resolve(m.id, m.away_placeholder);
    if (home === m.home_team_id && away === m.away_team_id) return m;
    return { ...m, home_team_id: home, away_team_id: away };
  });
}
