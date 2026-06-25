"use server";

import { redirect } from "next/navigation";

// Inscripciones cerradas: ya no se permiten nuevos registros.
export async function signup() {
  redirect(
    `/login?message=${encodeURIComponent("Las inscripciones están cerradas.")}`,
  );
}
