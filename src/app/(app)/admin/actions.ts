"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado.", supabase: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) return { error: "No autorizado.", supabase: null };
  return { error: null, supabase };
}

type SaveResultInput = {
  match_id: number;
  home_score_90: number;
  away_score_90: number;
  went_to_extra_time: boolean;
  went_to_penalties: boolean;
  winner_team_id: string | null; // requerido si knockout y empate a 90
  is_finalized: boolean;
};

export async function saveMatchResult(input: SaveResultInput) {
  const { error: authErr, supabase } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr };

  if (input.home_score_90 < 0 || input.away_score_90 < 0) {
    return { error: "Marcador inválido." };
  }

  // Cargar el partido para validaciones
  const { data: match } = await supabase
    .from("matches")
    .select("id, stage, home_team_id, away_team_id")
    .eq("id", input.match_id)
    .maybeSingle();
  if (!match) return { error: "Partido no encontrado." };

  const isKO = match.stage !== "group";
  const isDraw = input.home_score_90 === input.away_score_90;

  let winnerTeamId = input.winner_team_id;
  if (isKO && isDraw) {
    if (!winnerTeamId) {
      return {
        error:
          "En eliminatoria con empate a 90, debes elegir el ganador (alargue/penales).",
      };
    }
    if (
      winnerTeamId !== match.home_team_id &&
      winnerTeamId !== match.away_team_id
    ) {
      return { error: "El ganador debe ser uno de los dos equipos del partido." };
    }
  } else if (isKO && !isDraw) {
    // Ganador derivado
    winnerTeamId =
      input.home_score_90 > input.away_score_90
        ? match.home_team_id
        : match.away_team_id;
  } else {
    // Grupo: no aplica winner_team_id
    winnerTeamId = null;
  }

  const { error } = await supabase.from("match_results").upsert(
    {
      match_id: input.match_id,
      home_score_90: input.home_score_90,
      away_score_90: input.away_score_90,
      went_to_extra_time: input.went_to_extra_time,
      went_to_penalties: input.went_to_penalties,
      winner_team_id: winnerTeamId,
      is_finalized: input.is_finalized,
      finalized_at: input.is_finalized ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "match_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/resultados");
  revalidatePath("/predicciones/partidos");
  revalidatePath("/mi-resumen");
  return { ok: true };
}

export async function clearMatchResult(matchId: number) {
  const { error: authErr, supabase } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr };

  const { error } = await supabase
    .from("match_results")
    .delete()
    .eq("match_id", matchId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/resultados");
  return { ok: true };
}

type SaveTournamentResultsInput = {
  top_scorer: string | null;
  golden_ball: string | null;
  golden_glove: string | null;
  young_player: string | null;
  revelation_team: string | null;
  is_finalized: boolean;
};

export async function saveTournamentResults(input: SaveTournamentResultsInput) {
  const { error: authErr, supabase } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr };

  const { error } = await supabase
    .from("tournament_results")
    .upsert(
      {
        id: 1,
        top_scorer: input.top_scorer,
        golden_ball: input.golden_ball,
        golden_glove: input.golden_glove,
        young_player: input.young_player,
        revelation_team: input.revelation_team,
        is_finalized: input.is_finalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/resultados");
  revalidatePath("/mi-resumen");
  return { ok: true };
}
