import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ParticipantesPage() {
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, is_admin, created_at")
    .order("display_name", { ascending: true });

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Participantes</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Haz clic en un participante para ver sus predicciones (las que ya están
          cerradas).
        </p>
      </header>

      {!profiles || profiles.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Aún no hay participantes registrados.
        </p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {profiles.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
            >
              <Link
                href={`/participantes/${p.id}`}
                className="block px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{p.display_name}</span>
                  <span className="text-sm text-zinc-500 font-mono">0 pts</span>
                </div>
                {p.is_admin && (
                  <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold">
                    admin
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
