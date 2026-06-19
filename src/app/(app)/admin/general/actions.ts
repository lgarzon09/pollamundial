"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BracketDraftInput } from "@/app/(app)/predicciones/general/actions";

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

/**
 * Guarda el resultado OFICIAL de la predicción general (bracket_results, id=1).
 * Recibe el mismo payload que saveBracket pero ignora los premios (esos viven en
 * tournament_results y se cargan en /admin/resultados).
 */
export async function saveBracketResults(input: BracketDraftInput) {
  const { error: authErr, supabase } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr ?? "No autorizado." };

  const { error } = await supabase.from("bracket_results").upsert(
    {
      id: 1,
      group_positions: input.group_positions,
      r32_third_place_assignments: input.r32_third_place_assignments,
      r32_winners: input.r32_winners,
      r16_winners: input.r16_winners,
      qf_winners: input.qf_winners,
      sf_winners: input.sf_winners,
      finalists: input.finalists,
      champion: input.champion,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/admin/general");
  revalidatePath("/predicciones/general");
  revalidatePath("/mi-resumen");
  revalidatePath("/participantes");
  return { ok: true };
}
