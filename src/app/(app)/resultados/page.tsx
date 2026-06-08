import { redirect } from "next/navigation";

// /resultados se consolidó en /mi-resumen. Mantenemos esta ruta como redirect
// para no romper enlaces antiguos.
export default function ResultadosRedirect() {
  redirect("/mi-resumen");
}
