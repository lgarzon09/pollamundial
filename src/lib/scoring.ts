import type {
  Match,
  MatchPrediction,
  MatchResult,
  MatchStage,
  TournamentResults,
} from "./db/types";

/**
 * Puntos máximos posibles en un partido según su etapa.
 * (Marcador exacto 3 × mult) + ganador 2 + goles local 1 + goles visit. 1
 *   + diferencia 1 + goleada 1 (= 6 fijos)
 * + en KO: ganador KO +2
 */
export function maxPointsPerMatch(stage: MatchStage): number {
  const multByStage: Record<MatchStage, number> = {
    group: 1.0,
    r32: 1.5,
    r16: 2.0,
    qf: 2.5,
    sf: 3.0,
    third_place: 3.0,
    final: 4.0,
  };
  const isKO = stage !== "group";
  return 3 * multByStage[stage] + 2 + 1 + 1 + 1 + 1 + (isKO ? 2 : 0);
}

/** Sub-detalle de una línea: de dónde sale cada porción de puntos (p. ej. cada equipo). */
export type ScoreSubItem = {
  label: string;
  points: number;
};

export type ScoreLine = {
  label: string;
  points: number;
  correct: boolean;
  detail?: string;
  /** Desglose por equipo/posición que sumó esta línea (para mostrar expandible). */
  items?: ScoreSubItem[];
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

// ============================================================
// Puntuación de la PREDICCIÓN GENERAL (bracket)
// Compara el bracket del usuario contra el bracket OFICIAL (bracket_results)
// y los premios oficiales (tournament_results).
// Reglas (ver RulesExplained.tsx):
//   Posición exacta en grupo:      3 pts × equipo
//   Clasifica a Ronda de 32:       5 pts × equipo
//   Clasifica a octavos (R16):     8 pts × equipo
//   Clasifica a cuartos (QF):     12 pts × equipo
//   Clasifica a semifinales (SF): 15 pts × equipo
//   Equipo finalista:             20 pts × equipo
//   Campeón:                      30 pts
//   Goleador 25 · Balón 15 · Guante 15 · Joven 15 · Revelación 15
// ============================================================

const BRACKET_GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

// Forma estructural común a BracketPrediction y BracketResults.
// Los premios (top_scorer, etc.) solo existen en el bracket del usuario.
export type BracketShape = {
  group_positions?: Record<string, string[]> | null;
  r32_third_place_assignments?: Record<string, string> | null;
  r32_winners?: Record<string, string> | null;
  r16_winners?: Record<string, string> | null;
  qf_winners?: Record<string, string> | null;
  sf_winners?: Record<string, string> | null;
  finalists?: string[] | null;
  champion?: string | null;
  top_scorer?: string | null;
  golden_ball?: string | null;
  golden_glove?: string | null;
  young_player?: string | null;
  revelation_team?: string | null;
};

/** Equipos que un bracket "manda" a Ronda de 32: 1° y 2° de cada grupo + los 3° asignados. */
function r32TeamSet(b: BracketShape): Set<string> {
  const s = new Set<string>();
  for (const g of BRACKET_GROUPS) {
    const pos = b.group_positions?.[g] ?? [];
    if (pos[0]) s.add(pos[0]);
    if (pos[1]) s.add(pos[1]);
  }
  for (const tid of Object.values(b.r32_third_place_assignments ?? {})) {
    if (tid) s.add(tid);
  }
  return s;
}

/** Equipos en común entre `a` (predicho) y `b` (real), sin duplicados, en orden de `a`. */
function intersectList(a: Iterable<string>, b: Set<string>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of a) {
    if (x && b.has(x) && !seen.has(x)) {
      out.push(x);
      seen.add(x);
    }
  }
  return out;
}

/** Finalistas de un bracket: `finalists` si existe, si no los valores de `sf_winners`. */
function finalistSet(b: BracketShape): Set<string> {
  const arr =
    b.finalists && b.finalists.length > 0
      ? b.finalists
      : Object.values(b.sf_winners ?? {});
  return new Set(arr.filter(Boolean));
}

function sameText(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function scoreBracket(
  user: BracketShape | null,
  official: BracketShape | null,
  tournament: TournamentResults | null,
  teamsById?: Map<string, { name: string; flag_emoji: string | null }>,
): MatchScore {
  const lines: ScoreLine[] = [];
  if (!user) return { total: 0, lines };

  const off = official ?? {};

  // Etiqueta legible de un equipo (bandera + nombre); cae al id si no hay catálogo.
  const teamName = (id: string | null | undefined): string => {
    if (!id) return "?";
    const t = teamsById?.get(id);
    return t ? `${t.flag_emoji ?? ""} ${t.name}`.trim() : id;
  };

  // 1. Posiciones exactas de grupo (3 c/u)
  let groupHits = 0;
  const groupItems: ScoreSubItem[] = [];
  for (const g of BRACKET_GROUPS) {
    const up = user.group_positions?.[g] ?? [];
    const op = off.group_positions?.[g] ?? [];
    for (let i = 0; i < 4; i++) {
      if (up[i] && op[i] && up[i] === op[i]) {
        groupHits++;
        groupItems.push({
          label: `Grupo ${g} · ${i + 1}° ${teamName(up[i])}`,
          points: 3,
        });
      }
    }
  }
  lines.push({
    label: "Posiciones exactas de grupo",
    points: groupHits * 3,
    correct: groupHits > 0,
    detail: `${groupHits} acierto${groupHits === 1 ? "" : "s"} × 3`,
    items: groupItems.length > 0 ? groupItems : undefined,
  });

  // 2. Clasifican a cada ronda (intersección de equipos)
  const reaches: { label: string; pts: number; pred: Set<string>; real: Set<string> }[] = [
    {
      label: "Clasifican a Ronda de 32",
      pts: 5,
      pred: r32TeamSet(user),
      real: r32TeamSet(off),
    },
    {
      label: "Clasifican a octavos",
      pts: 8,
      pred: new Set(Object.values(user.r32_winners ?? {}).filter(Boolean)),
      real: new Set(Object.values(off.r32_winners ?? {}).filter(Boolean)),
    },
    {
      label: "Clasifican a cuartos",
      pts: 12,
      pred: new Set(Object.values(user.r16_winners ?? {}).filter(Boolean)),
      real: new Set(Object.values(off.r16_winners ?? {}).filter(Boolean)),
    },
    {
      label: "Clasifican a semifinales",
      pts: 15,
      pred: new Set(Object.values(user.qf_winners ?? {}).filter(Boolean)),
      real: new Set(Object.values(off.qf_winners ?? {}).filter(Boolean)),
    },
    {
      label: "Finalistas",
      pts: 20,
      pred: finalistSet(user),
      real: finalistSet(off),
    },
  ];
  for (const r of reaches) {
    const hitTeams = intersectList(r.pred, r.real);
    const hits = hitTeams.length;
    lines.push({
      label: r.label,
      points: hits * r.pts,
      correct: hits > 0,
      detail: `${hits} equipo${hits === 1 ? "" : "s"} × ${r.pts}`,
      items:
        hits > 0
          ? hitTeams.map((id) => ({ label: teamName(id), points: r.pts }))
          : undefined,
    });
  }

  // 3. Campeón (30)
  const championCorrect = !!user.champion && user.champion === off.champion;
  lines.push({
    label: "Campeón del Mundial",
    points: championCorrect ? 30 : 0,
    correct: championCorrect,
  });

  // 4. Premios (vs tournament_results)
  const awards: { label: string; pts: number; correct: boolean }[] = [
    { label: "Goleador", pts: 25, correct: sameText(user.top_scorer, tournament?.top_scorer) },
    { label: "Balón de Oro", pts: 15, correct: sameText(user.golden_ball, tournament?.golden_ball) },
    { label: "Guante de Oro", pts: 15, correct: sameText(user.golden_glove, tournament?.golden_glove) },
    { label: "Mejor jugador joven", pts: 15, correct: sameText(user.young_player, tournament?.young_player) },
    {
      label: "Equipo revelación",
      pts: 15,
      correct: !!user.revelation_team && user.revelation_team === tournament?.revelation_team,
    },
  ];
  for (const a of awards) {
    lines.push({ label: a.label, points: a.correct ? a.pts : 0, correct: a.correct });
  }

  const total = lines.reduce((s, l) => s + l.points, 0);
  return { total, lines };
}

/**
 * Puntos atribuibles a CADA selección individual del bracket, para mostrarlos
 * al lado de cada pick con su razón detallada. Mismas reglas que scoreBracket().
 */
export type PickReason = { label: string; points: number };
export type PickPoints = { total: number; reasons: PickReason[] };

const pickFromReasons = (reasons: PickReason[]): PickPoints => ({
  total: reasons.reduce((s, r) => s + r.points, 0),
  reasons,
});

export type BracketPickPoints = {
  /** Por grupo, los puntos+razones de cada slot 0..3. */
  groupPositions: Record<string, PickPoints[]>;
  /** Por match_id (string) del pick KO: r32/r16/qf/sf winners. */
  koWinners: Record<string, PickPoints>;
  champion: PickPoints;
  revelationTeam: PickPoints;
  topScorer: PickPoints;
  goldenBall: PickPoints;
  goldenGlove: PickPoints;
  youngPlayer: PickPoints;
};

export function bracketPickPoints(
  user: BracketShape | null,
  official: BracketShape | null,
  tournament: TournamentResults | null,
): BracketPickPoints {
  const none = pickFromReasons([]);
  const empty: BracketPickPoints = {
    groupPositions: {},
    koWinners: {},
    champion: none,
    revelationTeam: none,
    topScorer: none,
    goldenBall: none,
    goldenGlove: none,
    youngPlayer: none,
  };
  if (!user) return empty;
  const off = official ?? {};

  const userR32 = r32TeamSet(user);
  const offR32 = r32TeamSet(off);

  const groupPositions: Record<string, PickPoints[]> = {};
  for (const g of BRACKET_GROUPS) {
    const up = user.group_positions?.[g] ?? [];
    const op = off.group_positions?.[g] ?? [];
    groupPositions[g] = [0, 1, 2, 3].map((i) => {
      const t = up[i];
      const reasons: PickReason[] = [];
      if (t) {
        if (op[i] && t === op[i])
          reasons.push({ label: "Posición exacta en el grupo", points: 3 });
        if (userR32.has(t) && offR32.has(t))
          reasons.push({ label: "Clasificó a la Ronda de 32", points: 5 });
      }
      return pickFromReasons(reasons);
    });
  }

  const koWinners: Record<string, PickPoints> = {};
  const rounds: {
    winners?: Record<string, string> | null;
    real: Set<string>;
    pts: number;
    label: string;
  }[] = [
    {
      winners: user.r32_winners,
      real: new Set(Object.values(off.r32_winners ?? {}).filter(Boolean)),
      pts: 8,
      label: "Clasificó a octavos",
    },
    {
      winners: user.r16_winners,
      real: new Set(Object.values(off.r16_winners ?? {}).filter(Boolean)),
      pts: 12,
      label: "Clasificó a cuartos",
    },
    {
      winners: user.qf_winners,
      real: new Set(Object.values(off.qf_winners ?? {}).filter(Boolean)),
      pts: 15,
      label: "Clasificó a semifinales",
    },
    {
      winners: user.sf_winners,
      real: finalistSet(off),
      pts: 20,
      label: "Llegó a la final",
    },
  ];
  for (const r of rounds) {
    for (const [mid, t] of Object.entries(r.winners ?? {})) {
      if (t && r.real.has(t))
        koWinners[mid] = pickFromReasons([{ label: r.label, points: r.pts }]);
    }
  }

  const championOk = !!user.champion && user.champion === off.champion;
  const revelationOk =
    !!user.revelation_team && user.revelation_team === tournament?.revelation_team;

  return {
    groupPositions,
    koWinners,
    champion: pickFromReasons(
      championOk ? [{ label: "Acertaste al campeón", points: 30 }] : [],
    ),
    revelationTeam: pickFromReasons(
      revelationOk ? [{ label: "Acertaste el equipo revelación", points: 15 }] : [],
    ),
    topScorer: pickFromReasons(
      sameText(user.top_scorer, tournament?.top_scorer)
        ? [{ label: "Acertaste el goleador", points: 25 }]
        : [],
    ),
    goldenBall: pickFromReasons(
      sameText(user.golden_ball, tournament?.golden_ball)
        ? [{ label: "Acertaste el Balón de Oro", points: 15 }]
        : [],
    ),
    goldenGlove: pickFromReasons(
      sameText(user.golden_glove, tournament?.golden_glove)
        ? [{ label: "Acertaste el Guante de Oro", points: 15 }]
        : [],
    ),
    youngPlayer: pickFromReasons(
      sameText(user.young_player, tournament?.young_player)
        ? [{ label: "Acertaste el mejor jugador joven", points: 15 }]
        : [],
    ),
  };
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
