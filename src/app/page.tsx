import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RulesExplained } from "@/components/RulesExplained";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/mi-resumen");
  }

  return (
    <main className="flex-1 text-zinc-900 dark:text-zinc-100">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-emerald-950 dark:via-zinc-950 dark:to-sky-950 px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
            Mundial 2026 · USA · Canadá · México
          </p>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight">
            La Polla del{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-sky-600 bg-clip-text text-transparent">
              Mundial 2026
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-zinc-700 dark:text-zinc-300 max-w-2xl mx-auto">
            Predice los 104 partidos, llena tu bracket completo y compite con
            tus amigos por el puntaje más alto.
          </p>
          <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-2xl mx-auto pt-6">
            <BigStat n="48" label="Equipos" />
            <BigStat n="12" label="Grupos" />
            <BigStat n="104" label="Partidos" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base px-8 py-3.5 transition-colors shadow-lg shadow-emerald-500/20"
            >
              Únete a la polla
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border-2 border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 font-semibold text-base px-8 py-3.5 transition-colors"
            >
              Ya tengo cuenta
            </Link>
          </div>
          <p className="text-xs text-zinc-500 pt-2">
            Sin tarjeta · sin pagar · solo invitación
          </p>
        </div>
      </section>

      {/* Reglas y puntos */}
      <RulesExplained />

      {/* CTA FINAL */}
      <section className="px-4 sm:px-6 py-16 sm:py-24 bg-gradient-to-br from-emerald-600 to-sky-600 text-white">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black">
            ¿Listo para jugar?
          </h2>
          <p className="text-lg sm:text-xl text-white/90">
            Crea tu cuenta en 1 minuto y empieza a llenar tus predicciones.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-white text-emerald-700 hover:bg-emerald-50 font-bold text-base px-8 py-3.5 transition-colors shadow-lg"
            >
              Únete a la polla
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border-2 border-white/40 hover:bg-white/10 font-semibold text-base px-8 py-3.5 transition-colors"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-4 sm:px-6 py-8 bg-zinc-950 text-zinc-400 text-center text-sm">
        <p>
          Polla Mundial 2026 ·{" "}
          <Link href="/reglas" className="hover:text-emerald-400 underline">
            Ver reglas
          </Link>
        </p>
      </footer>
    </main>
  );
}

function BigStat({ n, label }: { n: string; label: string }) {
  return (
    <div className="space-y-1">
      <div className="text-3xl sm:text-5xl font-black bg-gradient-to-br from-emerald-600 to-sky-600 bg-clip-text text-transparent">
        {n}
      </div>
      <div className="text-xs sm:text-sm uppercase tracking-wider text-zinc-600 dark:text-zinc-400 font-semibold">
        {label}
      </div>
    </div>
  );
}
