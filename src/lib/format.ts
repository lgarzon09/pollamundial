// Formatos de fecha/hora. Siempre devolvemos strings legibles en español.
// La hora se calcula en la zona horaria local del navegador del usuario.

const DATE_FMT = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const TIME_FMT = new Intl.DateTimeFormat("es-CO", {
  hour: "2-digit",
  minute: "2-digit",
});
const DAYKEY_FMT = new Intl.DateTimeFormat("es-CO", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatMatchDate(iso: string) {
  return DATE_FMT.format(new Date(iso));
}
export function formatMatchTime(iso: string) {
  return TIME_FMT.format(new Date(iso));
}
export function dayKey(iso: string) {
  // YYYY-MM-DD en zona local
  const parts = DAYKEY_FMT.formatToParts(new Date(iso));
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  const d = parts.find((p) => p.type === "day")?.value ?? "";
  return `${y}-${m}-${d}`;
}
