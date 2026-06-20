import type { PostgrestError } from "@supabase/supabase-js";

type RangeResult<T> = { data: T[] | null; error: PostgrestError | null };

/**
 * Trae TODAS las filas de un query paginando con `.range()`.
 *
 * PostgREST/Supabase limita cada respuesta a un máximo de filas ("Max rows",
 * 1000 por defecto) y trunca los `select()` grandes SIN error. La tabla
 * `match_predictions` (participantes × partidos) supera fácilmente las 1000
 * filas, lo que corrompía silenciosamente los puntos y el orden del ranking.
 *
 * `makeQuery` debe reconstruir el query en cada página (los builders de
 * PostgREST son de un solo uso) e incluir un `.order()` estable (p. ej. por
 * `id`) para que las páginas no se solapen ni se salten filas.
 *
 * `pageSize` debe ser ≤ al "Max rows" del servidor (1000 por defecto); con un
 * valor mayor, una respuesta truncada se confundiría con la última página.
 */
export async function fetchAllRows<T>(
  makeQuery: (from: number, to: number) => PromiseLike<RangeResult<T>>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await makeQuery(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}
