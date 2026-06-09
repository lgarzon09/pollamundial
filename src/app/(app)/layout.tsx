import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/Nav";

const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: settings }, { data: bracket }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, is_admin")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("settings")
        .select("tournament_start_at")
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("bracket_predictions")
        .select("group_positions, champion")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  // ¿Banner de predicción general pendiente?
  const tournamentStart = settings?.tournament_start_at
    ? new Date(settings.tournament_start_at)
    : null;
  const bracketLocked = tournamentStart
    ? tournamentStart.getTime() <= Date.now()
    : false;
  const bracketComplete =
    !!bracket &&
    GROUPS.every((g) => {
      const pos = (bracket.group_positions as Record<string, string[]>)?.[g] ?? [];
      return pos.filter(Boolean).length === 4 && new Set(pos).size === 4;
    }) &&
    !!bracket.champion;
  const showBracketBanner = !bracketLocked && !bracketComplete;
  const daysToStart = tournamentStart
    ? Math.max(
        0,
        Math.ceil(
          (tournamentStart.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      )
    : null;

  return (
    <div className="flex-1 flex flex-col">
      <Nav
        displayName={profile?.display_name ?? user.email ?? ""}
        isAdmin={profile?.is_admin ?? false}
      />
      {showBracketBanner && (
        <Link
          href="/predicciones/general"
          className="block bg-amber-100 dark:bg-amber-950/80 border-b border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100 hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors"
        >
          <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-3 text-sm">
            <span className="flex-1 truncate">
              <span aria-hidden className="mr-1.5">⚠️</span>
              <strong>Te falta llenar tu predicción general.</strong>{" "}
              {daysToStart !== null && daysToStart > 0
                ? `Faltan ${daysToStart} día${daysToStart === 1 ? "" : "s"} para el cierre.`
                : daysToStart === 0
                  ? "Cierra HOY."
                  : ""}
            </span>
            <span className="font-semibold whitespace-nowrap underline">
              Completarla →
            </span>
          </div>
        </Link>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}
