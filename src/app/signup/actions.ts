"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!email || !password || !displayName) {
    redirect(
      `/signup?error=${encodeURIComponent("Faltan campos obligatorios.")}`,
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  // Si la confirmación de email está desactivada en Supabase, signUp ya devuelve sesión
  // y el usuario queda logueado automáticamente. Si por algún motivo no hay sesión,
  // intentamos sign-in inmediato como fallback.
  if (!data.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      redirect(
        `/login?message=${encodeURIComponent(
          "Cuenta creada. Inicia sesión con tu email y contraseña.",
        )}`,
      );
    }
  }

  revalidatePath("/", "layout");
  redirect("/mi-resumen");
}
