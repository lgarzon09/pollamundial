"use client";

import { useEffect, useState } from "react";

// Componentes cliente que formatean una fecha ISO en la TIMEZONE DEL NAVEGADOR.
// Se rehidratan después del primer render (cuando ya hay navigator).

const TIME_OPTS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
};
const DATE_OPTS: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
};

export function LocalTime({ iso }: { iso: string }) {
  const [text, setText] = useState<string>(() =>
    new Intl.DateTimeFormat("es-CO", TIME_OPTS).format(new Date(iso)),
  );
  useEffect(() => {
    // En el cliente usamos la TZ del navegador (omitiendo timeZone deja default)
    setText(new Intl.DateTimeFormat("es-CO", TIME_OPTS).format(new Date(iso)));
  }, [iso]);
  return <span suppressHydrationWarning>{text}</span>;
}

export function LocalDate({ iso }: { iso: string }) {
  const [text, setText] = useState<string>(() =>
    new Intl.DateTimeFormat("es-CO", DATE_OPTS).format(new Date(iso)),
  );
  useEffect(() => {
    setText(new Intl.DateTimeFormat("es-CO", DATE_OPTS).format(new Date(iso)));
  }, [iso]);
  return <span suppressHydrationWarning>{text}</span>;
}

// Fecha + hora completas (día, mes, año, hora:minuto) en la TZ del navegador.
// Útil para sellos de "última modificación" donde importa el momento exacto.
const FULL_OPTS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

export function LocalDateTimeFull({ iso }: { iso: string }) {
  const [text, setText] = useState<string>(() =>
    new Intl.DateTimeFormat("es-CO", FULL_OPTS).format(new Date(iso)),
  );
  useEffect(() => {
    setText(new Intl.DateTimeFormat("es-CO", FULL_OPTS).format(new Date(iso)));
  }, [iso]);
  return <span suppressHydrationWarning>{text}</span>;
}
