import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type {
  BracketPrediction,
  BracketResults,
  Match,
  MatchPrediction,
  Team,
} from "@/lib/db/types";
import { withOfficialMatchTeams } from "@/lib/bracket";
import { fetchAllRows } from "@/lib/db/fetchAll";
import { ChangeLogTable, type ChangeRow } from "@/components/ChangeLogTable";

export const dynamic = "force-dynamic";

const DAY_FMT = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  day: "numeric",
  month: "short",
});

// updated_at se considera "edición" sólo si es claramente posterior a created_at
// (mismo insert deja ambos casi iguales; damos 1s de margen).
const EDITED = (created: string, updated: string) =>
  new Date(updated).getTime() - new Date(created).getTime() > 1000;

export default async function AuditoriaCambiosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: matches },
    { data: teams },
    { data: profiles },
    { data: matchPreds },
    { data: brackets },
    { data: official },
  ] = await Promise.all([
    supabase.from("matches").select("*").order("kickoff_at", { ascending: true }),
    supabase.from("teams").select("*"),
    supabase.from("profiles").select("id, display_name, is_admin"),
    fetchAllRows<MatchPrediction>((from, to) =>
      supabase
        .from("match_predictions")
        .select("*")
        .order("id", { ascending: true })
        .range(from, to),
    ).then((data) => ({ data })),
    supabase
      .from("bracket_predictions")
      .select("user_id, created_at, updated_at, submitted_at"),
    supabase.from("bracket_results").select("*").eq("id", 1).maybeSingle(),
  ]);

  const teamsById = new Map<string, Team>((teams ?? []).map((t) => [t.id, t]));
  const officialBracket = (official as BracketResults | null) ?? null;
  const matchList = withOfficialMatchTeams(
    (matches ?? []) as Match[],
    officialBracket,
  );
  // Número secuencial 1..N por orden de kickoff (igual que en "puntos partido a partido").
  const matchInfo = new Map<number, { n: number; label: string }>();
  matchList.forEach((m, i) => {
    const teamLabel = (id: string | null, ph: string | null): string => {
      if (id) {
        const t = teamsById.get(id);
        if (t) return `${t.flag_emoji ?? ""} ${t.name}`.trim();
      }
      return ph ?? "?";
    };
    matchInfo.set(m.id, {
      n: i + 1,
      label: `P${i + 1} · ${teamLabel(m.home_team_id, m.home_placeholder)} vs ${teamLabel(
        m.away_team_id,
        m.away_placeholder,
      )} · ${DAY_FMT.format(new Date(m.kickoff_at))}`,
    });
  });

  const nameById = new Map<string, { name: string; isAdmin: boolean }>(
    (profiles ?? []).map((p) => [
      p.id,
      { name: p.display_name, isAdmin: !!p.is_admin },
    ]),
  );
  const who = (id: string) =>
    nameById.get(id) ?? { name: "Participante", isAdmin: false };

  const rows: ChangeRow[] = [];

  // Predicciones por partido (RLS sólo deja ver las propias y las de partidos
  // ya cerrados de los demás).
  for (const p of (matchPreds ?? []) as MatchPrediction[]) {
    const info = matchInfo.get(p.match_id);
    const u = who(p.user_id);
    rows.push({
      key: `m-${p.id}`,
      userId: p.user_id,
      name: u.name,
      isAdmin: u.isAdmin,
      kind: "match",
      what: info?.label ?? `Partido ${p.match_id}`,
      value: `${p.home_score_90}–${p.away_score_90}`,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      edited: EDITED(p.created_at, p.updated_at),
    });
  }

  // Predicción general (bracket). RLS: propia siempre; ajenas tras el lock.
  for (const b of (brackets ?? []) as Pick<
    BracketPrediction,
    "user_id" | "created_at" | "updated_at" | "submitted_at"
  >[]) {
    const u = who(b.user_id);
    rows.push({
      key: `b-${b.user_id}`,
      userId: b.user_id,
      name: u.name,
      isAdmin: u.isAdmin,
      kind: "bracket",
      what: "Predicción general (bracket)",
      value: b.submitted_at ? "enviada" : "borrador",
      createdAt: b.created_at,
      updatedAt: b.updated_at,
      edited: EDITED(b.created_at, b.updated_at),
    });
  }

  return (
    <main className="max-w-3xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-5">
      <header className="space-y-1">
        <div className="flex items-center gap-3 text-sm">
          <Link href="/mi-resumen" className="text-zinc-500 hover:text-emerald-600">
            ← Inicio
          </Link>
          <Link href="/auditoria" className="text-zinc-500 hover:text-emerald-600">
            Puntos partido a partido →
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">Auditoría de cambios</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
          Por transparencia: la <strong>última vez</strong> que cada persona tocó
          cada predicción y qué quedó guardado. Sólo aparecen las predicciones que
          ya son públicas para ti (las tuyas siempre; las de los demás, por
          partido, sólo después del cierre, y la predicción general una vez inicia
          el Mundial). La base de datos guarda el último cambio, no cada versión
          intermedia.
        </p>
      </header>

      <ChangeLogTable rows={rows} highlightUserId={user.id} />
    </main>
  );
}
