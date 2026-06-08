"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type SavePredictionInput = {
  match_id: number;
  home_score_90: number;
  away_score_90: number;
  ko_winner_team_id: string | null;
};

export async function savePrediction(input: SavePredictionInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  if (input.home_score_90 < 0 || input.away_score_90 < 0) {
    return { error: "Marcador inválido." };
  }

  const { error } = await supabase
    .from("match_predictions")
    .upsert(
      {
        user_id: user.id,
        match_id: input.match_id,
        home_score_90: input.home_score_90,
        away_score_90: input.away_score_90,
        // Goleada derivada del marcador; estos campos quedan inutilizados.
        predicted_blowout: false,
        blowout_team_id: null,
        ko_winner_team_id: input.ko_winner_team_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,match_id" },
    );

  if (error) return { error: error.message };

  revalidatePath("/predicciones/partidos");
  revalidatePath("/mi-resumen");
  revalidatePath("/resultados");
  return { ok: true };
}
