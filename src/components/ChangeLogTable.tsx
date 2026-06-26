"use client";

import { useMemo, useState } from "react";
import {
  LocalDateTimeFull,
  LocalDateTimeShort,
} from "@/components/LocalDateTime";

// Una fila = la última modificación de UNA predicción de UNA persona.
// La BD sólo guarda el estado actual + updated_at, así que esto refleja el
// último cambio de cada predicción, no el historial completo.
export type ChangeRow = {
  key: string;
  userId: string;
  name: string;
  isAdmin: boolean;
  kind: "match" | "bracket";
  what: string; // "P59 · 🇹🇷 Turquía vs 🇺🇸 Estados Unidos" o "Predicción general"
  value: string | null; // "2–1", "enviada", etc.
  kickoffIso: string | null; // hora del partido (sólo predicciones por partido)
  createdAt: string; // ISO
  updatedAt: string; // ISO
  edited: boolean; // updatedAt notablemente posterior a createdAt
};

type SortKey = "recent" | "oldest" | "name";
type KindFilter = "all" | "match" | "bracket";

const ts = (iso: string) => new Date(iso).getTime();

export function ChangeLogTable({
  rows,
  highlightUserId,
}: {
  rows: ChangeRow[];
  highlightUserId?: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [kind, setKind] = useState<KindFilter>("all");

  const view = useMemo(() => {
    const q = query.trim().toLowerCase();
    let r = rows;
    if (kind !== "all") r = r.filter((x) => x.kind === kind);
    if (q) r = r.filter((x) => x.name.toLowerCase().includes(q));
    const sorted = [...r];
    sorted.sort((a, b) => {
      if (sort === "name")
        return (
          a.name.localeCompare(b.name) || ts(b.updatedAt) - ts(a.updatedAt)
        );
      if (sort === "oldest") return ts(a.updatedAt) - ts(b.updatedAt);
      return ts(b.updatedAt) - ts(a.updatedAt); // recent
    });
    return sorted;
  }, [rows, query, sort, kind]);

  const KINDS: { key: KindFilter; label: string }[] = [
    { key: "all", label: "Todas" },
    { key: "match", label: "Por partido" },
    { key: "bracket", label: "General" },
  ];
  const SORTS: { key: SortKey; label: string }[] = [
    { key: "recent", label: "Más recientes" },
    { key: "oldest", label: "Más antiguas" },
    { key: "name", label: "Por participante" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar participante…"
          className="w-full sm:w-64 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5 text-xs">
            {KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                onClick={() => setKind(k.key)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  kind === k.key
                    ? "bg-emerald-600 text-white"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs outline-none focus:border-emerald-500"
            aria-label="Ordenar por"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leyenda para no confundir las dos horas */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
        <span className="text-sky-600 dark:text-sky-400">
          🟢 Partido = cuándo se juega
        </span>
        <span className="text-emerald-600 dark:text-emerald-400">
          ✎ Creada/Editada = cuándo se hizo la predicción
        </span>
        <span className="text-zinc-400">Ambas en tu hora local.</span>
      </div>

      <p className="text-xs text-zinc-500">
        {view.length} {view.length === 1 ? "predicción" : "predicciones"} ·{" "}
        <span className="text-zinc-400">
          muestra la última modificación de cada una
        </span>
      </p>

      <ul className="rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
        {view.map((r) => {
          const mine = r.userId === highlightUserId;
          return (
            <li
              key={r.key}
              className={`px-3 sm:px-4 py-3 flex items-start gap-3 ${
                mine ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""
              }`}
            >
              {/* Izquierda: quién y qué predicción (incluye hora del partido) */}
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium text-sm">{r.name}</span>
                  {mine && (
                    <span className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold">
                      tú
                    </span>
                  )}
                  {r.isAdmin && (
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                      admin
                    </span>
                  )}
                  <span
                    className={`text-[10px] uppercase tracking-wider font-semibold ${
                      r.kind === "bracket" ? "text-indigo-500" : "text-zinc-400"
                    }`}
                  >
                    {r.kind === "bracket" ? "general" : "partido"}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                  {r.what}
                  {r.value && (
                    <span className="text-zinc-800 dark:text-zinc-200">
                      {r.kind === "match" ? " · marcador " : " · "}
                      <span className="font-mono font-semibold">{r.value}</span>
                    </span>
                  )}
                </p>
                {r.kickoffIso && (
                  <p className="text-[11px] text-sky-600 dark:text-sky-400">
                    🟢 Partido:{" "}
                    <span className="font-medium">
                      <LocalDateTimeShort iso={r.kickoffIso} />
                    </span>
                  </p>
                )}
              </div>

              {/* Derecha: cuándo se creó/editó (etiqueta explícita) */}
              <div className="text-right shrink-0">
                <p
                  className={`text-[10px] uppercase tracking-wider font-semibold ${
                    r.edited
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-zinc-500"
                  }`}
                >
                  ✎ {r.edited ? "Editada el" : "Creada el"}
                </p>
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                  <LocalDateTimeFull iso={r.updatedAt} />
                </p>
                <p className="text-[10px] text-zinc-400">hora local</p>
              </div>
            </li>
          );
        })}
        {view.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-zinc-500">
            No hay predicciones que mostrar.
          </li>
        )}
      </ul>
    </div>
  );
}
