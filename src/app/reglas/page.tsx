import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RulesExplained } from "@/components/RulesExplained";

export const metadata = {
  title: "Reglas · Polla Mundial 2026",
};

export default async function ReglasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const backHref = user ? "/mi-resumen" : "/";

  return (
    <main className="flex-1 text-zinc-900 dark:text-zinc-100">
      {/* Encabezado */}
      <section className="px-4 sm:px-6 py-12 sm:py-16 bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-emerald-950 dark:via-zinc-950 dark:to-sky-950">
        <div className="max-w-4xl mx-auto space-y-4">
          <Link
            href={backHref}
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 inline-flex items-center gap-1"
          >
            ← Volver
          </Link>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
            Reglas y puntuación
          </h1>
          <p className="text-lg text-zinc-700 dark:text-zinc-300 max-w-2xl">
            Cómo se juega, cómo se ganan puntos y todas las reglas clave.
          </p>
        </div>
      </section>

      <RulesExplained />

      <footer className="px-4 sm:px-6 py-8 bg-zinc-950 text-zinc-400 text-center text-sm">
        <p>Polla Mundial 2026</p>
      </footer>
    </main>
  );
}
