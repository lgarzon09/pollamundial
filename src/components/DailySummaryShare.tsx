"use client";

import { useState } from "react";

/**
 * Muestra el texto del resumen diario listo para reenviar y ofrece tres formas
 * de compartirlo: WhatsApp (link wa.me que abre el selector de chat), correo
 * (mailto) y copiar al portapapeles. Todo pasa por el cliente: no se envía nada
 * a ningún servidor — el admin abre, comparte y reenvía a mano.
 */
export function DailySummaryShare({
  text,
  subject,
}: {
  text: string;
  subject: string;
}) {
  const [copied, setCopied] = useState(false);

  const waHref = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(text)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 text-sm"
        >
          <span aria-hidden>🟢</span> Compartir por WhatsApp
        </a>
        <a
          href={mailHref}
          className="inline-flex items-center gap-2 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold px-4 py-2 text-sm"
        >
          <span aria-hidden>✉️</span> Enviar por correo
        </a>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-2 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold px-4 py-2 text-sm"
        >
          <span aria-hidden>{copied ? "✅" : "📋"}</span>
          {copied ? "Copiado" : "Copiar texto"}
        </button>
      </div>

      <textarea
        readOnly
        value={text}
        rows={Math.min(24, text.split("\n").length + 1)}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm font-mono leading-relaxed outline-none focus:border-emerald-500 resize-y"
      />
      <p className="text-xs text-zinc-500">
        El botón de WhatsApp abre la app para que elijas a quién enviarlo (o lo
        pegues en el grupo). Nada se envía automáticamente — tú reenvías.
      </p>
    </div>
  );
}
