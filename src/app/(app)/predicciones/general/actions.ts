"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type BracketDraftInput = {
  group_positions: Record<string, string[]>;
  r32_third_place_assignments: Record<string, string>;
  r32_winners: Record<string, string>;
  r16_winners: Record<string, string>;
  qf_winners: Record<string, string>;
  sf_winners: Record<string, string>;
  finalists: string[];
  champion: string | null;
  top_scorer: string | null;
  golden_ball: string | null;
  golden_glove: string | null;
  young_player: string | null;
  revelation_team: string | null;
};

export async function saveBracket(input: BracketDraftInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  // Validar contra el deadline (tournament_start)
  const { data: settings } = await supabase
    .from("settings")
    .select("tournament_start_at")
    .eq("id", 1)
    .maybeSingle();
  if (settings && new Date(settings.tournament_start_at).getTime() <= Date.now()) {
    return { error: "La predicción general ya está cerrada: el Mundial inició." };
  }

  const payload = {
    user_id: user.id,
    group_positions: input.group_positions,
    r32_third_place_assignments: input.r32_third_place_assignments,
    r32_winners: input.r32_winners,
    r16_winners: input.r16_winners,
    qf_winners: input.qf_winners,
    sf_winners: input.sf_winners,
    finalists: input.finalists,
    champion: input.champion,
    top_scorer: input.top_scorer,
    golden_ball: input.golden_ball,
    golden_glove: input.golden_glove,
    young_player: input.young_player,
    revelation_team: input.revelation_team,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("bracket_predictions")
    .upsert(payload, { onConflict: "user_id" });

  if (error) return { error: error.message };

  revalidatePath("/predicciones/general");
  revalidatePath("/mi-resumen");
  revalidatePath("/resultados");
  return { ok: true };
}
