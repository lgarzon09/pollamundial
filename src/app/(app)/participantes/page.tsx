import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type ProgressRow = {
  id: string;
  display_name: string;
  email: string;
  is_admin: boolean;
  groups_completed: number;
  groups_incomplete_codes: string[];
  champion_set: boolean;
  top_scorer_set: boolean;
  golden_ball_set: boolean;
  golden_glove_set: boolean;
  young_player_set: boolean;
  revelation_team_set: boolean;
  bracket_started: boolean;
  predictions_count: number;
  available_matches_count: number;
};

export const dynamic = "force-dynamic";

export default async function ParticipantesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: rows }, { data: myProfile }] = await Promise.all([
    supabase.rpc("participant_progress"),
    user
      ? supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const isAdmin = !!myProfile?.is_admin;
  const participants = (rows ?? []) as ProgressRow[];
  const totalAvailable = participants[0]?.available_matches_count ?? 72;

  return (
    <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-5">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold">Participantes</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Progreso de cada participante. Haz clic en uno para ver sus
          predicciones (las que ya estén disponibles).
        </p>
        <p className="text-sm mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/auditoria" className="text-emerald-600 hover:underline">
            Ver puntos partido a partido →
          </Link>
          <Link
            href="/auditoria/cambios"
            className="text-emerald-600 hover:underline"
          >
            Ver auditoría de cambios →
          </Link>
        </p>
      </header>

      {participants.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Aún no hay participantes registrados.
        </p>
      ) : (
        <ul className="space-y-2">
          {participants.map((p) => {
            const totalMatchesForUser = p.available_matches_count || totalAvailable;
            const bracketComplete = p.groups_completed === 12 && p.champion_set;
            const matchPct =
              totalMatchesForUser > 0
                ? Math.round((p.predictions_count / totalMatchesForUser) * 100)
                : 0;
            return (
              <li
                key={p.id}
                className={`rounded-xl border bg-white dark:bg-zinc-900 ${
                  user?.id === p.id
                    ? "border-emerald-300 dark:border-emerald-800"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <Link
                  href={`/participantes/${p.id}`}
                  className="block px-4 sm:px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{p.display_name}</span>
                        {user?.id === p.id && (
                          <span className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold">
                            tú
                          </span>
                        )}
                        {p.is_admin && (
                          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                            admin
                          </span>
                        )}
                      </div>
                      {isAdmin && (
                        <p className="text-xs text-zinc-500 mt-0.5 truncate">
                          {p.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <ProgressLine
                      label="Predicción general"
                      detail={
                        bracketComplete
                          ? "100% completa"
                          : !p.bracket_started
                            ? "sin empezar"
                            : `${p.groups_completed}/12 grupos${p.champion_set ? " · ✓ campeón" : ""}`
                      }
                      pct={
                        bracketComplete
                          ? 100
                          : Math.round(
                              ((p.groups_completed +
                                (p.champion_set ? 1 : 0)) /
                                13) *
                                100,
                            )
                      }
                      complete={bracketComplete}
                    />
                    <ProgressLine
                      label="Predicciones por partido"
                      detail={`${p.predictions_count}/${totalMatchesForUser} (${matchPct}%)`}
                      pct={matchPct}
                      complete={p.predictions_count === totalMatchesForUser}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function ProgressLine({
  label,
  detail,
  pct,
  complete,
}: {
  label: string;
  detail: string;
  pct: number;
  complete: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
        <span
          className={`font-mono ${
            complete
              ? "text-emerald-700 dark:text-emerald-400 font-semibold"
              : "text-zinc-500"
          }`}
        >
          {complete && "✓ "}
          {detail}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            complete
              ? "bg-emerald-500"
              : pct > 0
                ? "bg-emerald-400 dark:bg-emerald-600"
                : "bg-transparent"
          }`}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}
