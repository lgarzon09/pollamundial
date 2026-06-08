import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/mi-resumen");
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Mundial 2026 — USA · Canadá · México
          </p>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight">
            Polla Mundial <span className="text-emerald-600">2026</span>
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
            Llena tu predicción general antes del primer partido, predice cada
            uno de los 104 partidos y compite contra tus amigos.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3 transition-colors"
          >
            Crear cuenta
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900 font-semibold px-8 py-3 transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>

        <p className="text-sm text-zinc-500">
          <Link href="/reglas" className="underline hover:text-emerald-600">
            Ver reglas y puntuación
          </Link>
        </p>
      </div>
    </main>
  );
}
