"use client";

import { useMemo, useState } from "react";

export type AuditMatch = {
  id: number;
  n: number; // número secuencial 1..104 por orden de kickoff
  stage: string; // etiqueta corta de etapa
  finalized: boolean;
  label: string; // "🇲🇽 México vs 🇿🇦 Sudáfrica · 11 jun" (para el tooltip)
};

export type AuditRow = {
  id: string;
  name: string;
  isAdmin: boolean;
  total: number; // puntos por partido (suma de las celdas finalizadas)
  cells: (number | null)[]; // alineado con matches; null = partido sin resultado aún
};

const fmt = (n: number) => n.toString().replace(/\.0$/, "");

export function AuditTable({
  matches,
  rows,
  highlightUserId,
}: {
  matches: AuditMatch[];
  rows: AuditRow[];
  highlightUserId?: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [query, rows]);

  const finalizedCount = matches.filter((m) => m.finalized).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar participante…"
          className="w-full sm:w-72 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />
        <p className="text-xs text-zinc-500 whitespace-nowrap">
          {filtered.length} de {rows.length} participantes ·{" "}
          {finalizedCount}/{matches.length} partidos con resultado
        </p>
      </div>

      <div className="overflow-auto max-h-[75vh] rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="text-sm border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-950">
              <th className="sticky left-0 top-0 z-30 bg-zinc-50 dark:bg-zinc-950 text-left px-3 py-2 w-44 min-w-44 border-b border-r border-zinc-200 dark:border-zinc-800">
                Participante
              </th>
              <th className="sticky left-44 top-0 z-30 bg-zinc-50 dark:bg-zinc-950 text-right px-3 py-2 w-20 min-w-20 border-b border-r border-zinc-200 dark:border-zinc-800">
                Total
                <span className="block text-[10px] font-normal text-zinc-400">
                  por partido
                </span>
              </th>
              {matches.map((m) => (
                <th
                  key={m.id}
                  title={`P${m.n} · ${m.label}${m.finalized ? "" : " · sin resultado"}`}
                  className={`sticky top-0 z-20 px-2 py-2 w-12 min-w-12 text-center border-b border-zinc-200 dark:border-zinc-800 ${
                    m.finalized
                      ? "bg-zinc-50 dark:bg-zinc-950"
                      : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400"
                  }`}
                >
                  <span className="block font-mono text-xs">P{m.n}</span>
                  <span className="block text-[9px] uppercase tracking-wide text-zinc-400 font-normal">
                    {m.stage}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const mine = r.id === highlightUserId;
              const nameBg = mine
                ? "bg-emerald-50 dark:bg-emerald-950/40"
                : "bg-white dark:bg-zinc-900";
              return (
                <tr
                  key={r.id}
                  className={
                    mine ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""
                  }
                >
                  <td
                    className={`sticky left-0 z-10 ${nameBg} px-3 py-1.5 w-44 min-w-44 border-b border-r border-zinc-100 dark:border-zinc-800`}
                  >
                    <span className="font-medium truncate block max-w-40">
                      {r.name}
                      {mine && (
                        <span className="ml-1 text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold">
                          tú
                        </span>
                      )}
                      {r.isAdmin && (
                        <span className="ml-1 text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                          admin
                        </span>
                      )}
                    </span>
                  </td>
                  <td
                    className={`sticky left-44 z-10 ${nameBg} px-3 py-1.5 w-20 min-w-20 text-right font-mono font-semibold border-b border-r border-zinc-100 dark:border-zinc-800`}
                  >
                    {fmt(r.total)}
                  </td>
                  {r.cells.map((c, i) => (
                    <td
                      key={matches[i].id}
                      className={`px-2 py-1.5 w-12 min-w-12 text-center font-mono border-b border-zinc-100 dark:border-zinc-800 ${
                        c === null
                          ? "text-zinc-300 dark:text-zinc-700"
                          : c > 0
                            ? "text-emerald-700 dark:text-emerald-400 font-semibold"
                            : "text-zinc-400 dark:text-zinc-600"
                      }`}
                    >
                      {c === null ? "·" : fmt(c)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={matches.length + 2}
                  className="px-4 py-6 text-center text-sm text-zinc-500"
                >
                  No hay participantes que coincidan con “{query}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-500">
        Cada celda muestra los puntos <strong>por partido</strong> que ganó esa
        persona en ese partido (P1…P{matches.length}, en orden de fecha). Solo
        cambia si el admin corrige el resultado oficial de un partido — no
        cambia día a día. Pasa el cursor sobre el encabezado para ver el
        partido. No incluye los puntos de la predicción general.
      </p>
    </div>
  );
}
