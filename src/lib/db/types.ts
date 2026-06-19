// Tipos TypeScript de la BD (espejo del schema.sql). Mantener sincronizados.

export type MatchStage =
  | "group"
  | "r32"
  | "r16"
  | "qf"
  | "sf"
  | "third_place"
  | "final";

export type SlotPosition = "home" | "away";

export type Team = {
  id: string;
  name: string;
  flag_emoji: string | null;
  confederation: string | null;
  group_code: string | null;
};

export type Group = {
  code: string;
  name: string;
};

export type Match = {
  id: number;
  stage: MatchStage;
  group_code: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  kickoff_at: string; // ISO timestamp UTC
  venue: string | null;
  city: string | null;
  country: string | null;
  winner_to_match_id: number | null;
  winner_to_slot: SlotPosition | null;
  loser_to_match_id: number | null;
  loser_to_slot: SlotPosition | null;
  score_multiplier: number;
  is_knockout: boolean;
};

export type MatchResult = {
  match_id: number;
  home_score_90: number;
  away_score_90: number;
  went_to_extra_time: boolean;
  went_to_penalties: boolean;
  winner_team_id: string | null;
  is_finalized: boolean;
  finalized_at: string | null;
  updated_at: string;
};

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
  created_at: string;
};

export type MatchPrediction = {
  id: string;
  user_id: string;
  match_id: number;
  home_score_90: number;
  away_score_90: number;
  predicted_blowout: boolean;
  blowout_team_id: string | null;
  ko_winner_team_id: string | null;
  created_at: string;
  updated_at: string;
};

export type BracketPrediction = {
  user_id: string;
  group_positions: Record<string, string[]>; // { "A": ["MEX","CZE","KOR","RSA"] }
  // Asigna un equipo de 3° lugar a cada slot R32 "3° A/B/C/D/F"
  // Clave: match_id (string), Valor: team_id elegido del pool de 3° de esos grupos
  r32_third_place_assignments: Record<string, string>;
  r32_winners: Record<string, string>; // { "73": "ARG" }
  r16_winners: Record<string, string>;
  qf_winners: Record<string, string>;
  sf_winners: Record<string, string>;
  finalists: string[]; // ["ARG", "BRA"]
  champion: string | null;
  top_scorer: string | null;
  golden_ball: string | null;
  golden_glove: string | null;
  young_player: string | null;
  revelation_team: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

// Resultado OFICIAL de la predicción general (lo carga el admin).
// Misma forma que BracketPrediction pero sin user_id y con is_finalized.
export type BracketResults = {
  id: 1;
  group_positions: Record<string, string[]>;
  r32_third_place_assignments: Record<string, string>;
  r32_winners: Record<string, string>;
  r16_winners: Record<string, string>;
  qf_winners: Record<string, string>;
  sf_winners: Record<string, string>;
  finalists: string[];
  champion: string | null;
  is_finalized: boolean;
  updated_at: string;
};

export type TournamentResults = {
  id: 1;
  top_scorer: string | null;
  golden_ball: string | null;
  golden_glove: string | null;
  young_player: string | null;
  revelation_team: string | null;
  is_finalized: boolean;
  updated_at: string;
};

export type Settings = {
  id: 1;
  tournament_name: string;
  tournament_start_at: string;
  match_prediction_cutoff_minutes: number;
  updated_at: string;
};

// Helpers
export const STAGE_LABEL: Record<MatchStage, string> = {
  group: "Fase de grupos",
  r32: "Ronda de 32",
  r16: "Octavos de final",
  qf: "Cuartos de final",
  sf: "Semifinales",
  third_place: "Tercer puesto",
  final: "Final",
};

export const STAGE_SHORT: Record<MatchStage, string> = {
  group: "Grupos",
  r32: "R32",
  r16: "8vos",
  qf: "4tos",
  sf: "Semis",
  third_place: "3° puesto",
  final: "Final",
};
