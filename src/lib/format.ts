// Formatos de fecha/hora.
//
// IMPORTANTE: las funciones de este archivo se usan tanto en SSR (servidor de
// Vercel, que está en UTC) como en cliente. Para que el agrupamiento por día y
// los headers no varíen según dónde corra el código, forzamos una zona
// horaria fija (Colombia). Las horas individuales por partido se muestran via
// componentes cliente <LocalTime /> que sí usan la TZ real del navegador.

const TZ = "America/Bogota";

const DATE_FMT = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TZ,
});
const TIME_FMT = new Intl.DateTimeFormat("es-CO", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});
const DAYKEY_FMT = new Intl.DateTimeFormat("es-CO", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TZ,
});

export function formatMatchDate(iso: string) {
  return DATE_FMT.format(new Date(iso));
}
export function formatMatchTime(iso: string) {
  return TIME_FMT.format(new Date(iso));
}
export function dayKey(iso: string) {
  // YYYY-MM-DD en TZ fija
  const parts = DAYKEY_FMT.formatToParts(new Date(iso));
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  const d = parts.find((p) => p.type === "day")?.value ?? "";
  return `${y}-${m}-${d}`;
}
