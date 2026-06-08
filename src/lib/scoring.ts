import type { Match, MatchPrediction, MatchResult } from "./db/types";

export type ScoreLine = {
  label: string;
  points: number;
  correct: boolean;
  detail?: string;
};

export type MatchScore = {
  total: number;
  lines: ScoreLine[];
};

/**
 * Calcula los puntos de un usuario en un partido.
 *
 * Reglas (ver memory/project_scoring_rules.md):
 * - Marcador exacto a 90 min: 3 pts × multiplicador por etapa
 * - Ganador/empate correcto: 2 pts
 * - Goles equipo local correctos: 1 pt
 * - Goles equipo visitante correctos: 1 pt
 * - Diferencia de gol exacta: 1 pt
 * - Goleada predicha (derivada del marcador: |dif| ≥ 3 con el mismo equipo ganador): 1 pt
 * - En KO, ganador final correcto (incluye alargue/penales): +2 pts
 *   - Si el marcador a 90 min predicho tiene ganador, ese es implícitamente el ganador KO predicho.
 *   - Si es empate, se usa ko_winner_team_id.
 */
export function scoreMatch(
  match: Match,
  prediction: MatchPrediction | null,
  result: MatchResult | null,
): MatchScore {
  if (!prediction || !result || !result.is_finalized) {
    return { total: 0, lines: [] };
  }

  const mult = match.score_multiplier ?? 1;
  const ph = prediction.home_score_90;
  const pa = prediction.away_score_90;
  const rh = result.home_score_90;
  const ra = result.away_score_90;

  const exactScore = ph === rh && pa === ra;
  const predDir = Math.sign(ph - pa); // 1 home, -1 away, 0 draw
  const realDir = Math.sign(rh - ra);
  const winnerCorrect = predDir === realDir;
  const homeGoalsCorrect = ph === rh;
  const awayGoalsCorrect = pa === ra;
  const diffCorrect = ph - pa === rh - ra;

  // Goleada derivada del marcador: |dif| ≥ 3 en ambos y mismo equipo gana
  const predBlowout = Math.abs(ph - pa) >= 3;
  const realBlowout = Math.abs(rh - ra) >= 3;
  const blowoutCorrect = predBlowout && realBlowout && predDir === realDir && predDir !== 0;

  const lines: ScoreLine[] = [
    {
      label: "Marcador exacto",
      points: exactScore ? 3 * mult : 0,
      correct: exactScore,
      detail: exactScore
        ? `3 × ${mult.toString().replace(/\.0$/, "")} multiplicador`
        : `Tu: ${ph}–${pa} · Real: ${rh}–${ra}`,
    },
    {
      label: "Ganador / empate",
      points: winnerCorrect ? 2 : 0,
      correct: winnerCorrect,
    },
    {
      label: "Goles del equipo local",
      points: homeGoalsCorrect ? 1 : 0,
      correct: homeGoalsCorrect,
      detail: homeGoalsCorrect ? undefined : `Tu: ${ph} · Real: ${rh}`,
    },
    {
      label: "Goles del equipo visitante",
      points: awayGoalsCorrect ? 1 : 0,
      correct: awayGoalsCorrect,
      detail: awayGoalsCorrect ? undefined : `Tu: ${pa} · Real: ${ra}`,
    },
    {
      label: "Diferencia de gol",
      points: diffCorrect ? 1 : 0,
      correct: diffCorrect,
      detail: diffCorrect
        ? undefined
        : `Tu: ${ph - pa} · Real: ${rh - ra}`,
    },
    {
      label: "Goleada (3+ goles del mismo equipo)",
      points: blowoutCorrect ? 1 : 0,
      correct: blowoutCorrect,
      detail: predBlowout
        ? `Predijiste ${Math.abs(ph - pa)} de diferencia`
        : "No predijiste goleada",
    },
  ];

  // KO: ganador final
  if (match.is_knockout) {
    const predictedKOWinner =
      predDir > 0
        ? match.home_team_id
        : predDir < 0
          ? match.away_team_id
          : (prediction.ko_winner_team_id ?? null);
    const actualKOWinner =
      result.went_to_extra_time || result.went_to_penalties
        ? result.winner_team_id
        : realDir > 0
          ? match.home_team_id
          : realDir < 0
            ? match.away_team_id
            : null;
    const koCorrect =
      !!predictedKOWinner &&
      !!actualKOWinner &&
      predictedKOWinner === actualKOWinner;

    lines.push({
      label: "Ganador final (incluye alargue/penales)",
      points: koCorrect ? 2 : 0,
      correct: koCorrect,
    });
  }

  const total = lines.reduce((s, l) => s + l.points, 0);
  return { total, lines };
}

/**
 * Suma los puntos totales del usuario en todos los partidos con resultado finalizado.
 */
export function totalMatchPoints(
  matches: Match[],
  predictionsByMatch: Map<number, MatchPrediction>,
  resultsByMatch: Map<number, MatchResult>,
): { total: number; exactCount: number; resolvedCount: number } {
  let total = 0;
  let exactCount = 0;
  let resolvedCount = 0;
  for (const m of matches) {
    const p = predictionsByMatch.get(m.id) ?? null;
    const r = resultsByMatch.get(m.id) ?? null;
    if (!r?.is_finalized) continue;
    resolvedCount++;
    if (!p) continue;
    const s = scoreMatch(m, p, r);
    total += s.total;
    if (s.lines[0]?.correct) exactCount++;
  }
  return { total, exactCount, resolvedCount };
}
