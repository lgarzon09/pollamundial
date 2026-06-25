"use client";

import { useMemo, useState } from "react";

export type AuditMatch = {
  id: number;
  n: number; // número secuencial 1..104 por orden de kickoff
  stage: string; // etiqueta corta de etapa
  finalized: boolean;
  label: string; // "🇲🇽 México vs 🇿🇦 Sudáfrica · 11 jun" (para el tooltip)
  homeFlag: string; // bandera del equipo local ("" si aún no se define)
  awayFlag: string; // bandera del equipo visitante ("" si aún no se define)
  real: string | null; // marcador real "2–1" si está finalizado
};

export type AuditCell = {
  pts: number | null; // null = partido sin resultado aún
  pred: string | null; // marcador que puso el usuario "2–1" (null si no predijo)
};

export type AuditRow = {
  id: string;
  name: string;
  isAdmin: boolean;
  total: number; // puntos por partido (suma de las celdas finalizadas)
  cells: AuditCell[]; // alineado con matches
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
              <th className="sticky left-0 top-0 z-30 bg-zinc-50 dark:bg-zinc-950 text-left px-2 sm:px-3 py-2 w-32 sm:w-44 min-w-32 sm:min-w-44 border-b border-r border-zinc-200 dark:border-zinc-800">
                Participante
              </th>
              <th className="sticky left-32 sm:left-44 top-0 z-30 bg-zinc-50 dark:bg-zinc-950 text-right px-2 sm:px-3 py-2 w-16 sm:w-20 min-w-16 sm:min-w-20 border-b border-r border-zinc-200 dark:border-zinc-800">
                Total
                <span className="block text-[10px] font-normal text-zinc-400">
                  por partido
                </span>
              </th>
              {matches.map((m) => (
                <th
                  key={m.id}
                  title={`${m.label}${m.finalized ? "" : " · sin resultado"}`}
                  className={`sticky top-0 z-20 px-2 py-2 w-16 min-w-16 text-center border-b border-zinc-200 dark:border-zinc-800 ${
                    m.finalized
                      ? "bg-zinc-50 dark:bg-zinc-950"
                      : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400"
                  }`}
                >
                  <span className="block text-base leading-none" aria-hidden>
                    {m.homeFlag || "·"}
                  </span>
                  <span className="block text-base leading-none mt-0.5" aria-hidden>
                    {m.awayFlag || "·"}
                  </span>
                  <span className="block text-[9px] uppercase tracking-wide text-zinc-400 font-normal mt-0.5">
                    {m.stage}
                  </span>
                  <span className="block font-mono text-[11px] mt-0.5 text-zinc-700 dark:text-zinc-300 font-semibold">
                    {m.real ?? "—"}
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
                    className={`sticky left-0 z-10 ${nameBg} px-2 sm:px-3 py-1.5 w-32 sm:w-44 min-w-32 sm:min-w-44 border-b border-r border-zinc-100 dark:border-zinc-800`}
                  >
                    <span className="font-medium truncate block max-w-28 sm:max-w-40">
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
                    className={`sticky left-32 sm:left-44 z-10 ${nameBg} px-2 sm:px-3 py-1.5 w-16 sm:w-20 min-w-16 sm:min-w-20 text-right font-mono font-semibold border-b border-r border-zinc-100 dark:border-zinc-800`}
                  >
                    {fmt(r.total)}
                  </td>
                  {r.cells.map((c, i) => (
                    <td
                      key={matches[i].id}
                      className="px-2 py-1.5 w-16 min-w-16 text-center border-b border-zinc-100 dark:border-zinc-800"
                    >
                      {c.pts === null ? (
                        <span className="font-mono text-zinc-300 dark:text-zinc-700">
                          ·
                        </span>
                      ) : (
                        <>
                          <span
                            className={`block font-mono font-semibold ${
                              c.pts > 0
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-zinc-400 dark:text-zinc-600"
                            }`}
                          >
                            {fmt(c.pts)}
                          </span>
                          <span className="block font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                            {c.pred ?? "—"}
                          </span>
                        </>
                      )}
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
        Cada celda muestra los puntos <strong>por partido</strong> (arriba) y el{" "}
        <strong>marcador que puso esa persona</strong> (abajo). En el encabezado
        de cada columna están las <strong>banderas de las dos selecciones</strong>{" "}
        y el <strong>marcador real</strong>. Los partidos van en orden de fecha;
        pasa el cursor sobre el encabezado para ver los equipos, la fecha y el
        número de partido. Una vez un partido queda finalizado y
        actualizado, su puntaje no debería volver a cambiar. No incluye los
        puntos de la predicción general.
      </p>
    </div>
  );
}
