import Link from "next/link";

export const metadata = {
  title: "Reglas · Polla Mundial 2026",
};

export default function ReglasPage() {
  return (
    <main className="flex-1 px-4 sm:px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">Reglas y puntuación</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Polla Mundial 2026 · USA · Canadá · México
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-emerald-600 mt-2"
          >
            ← Volver
          </Link>
        </header>

        <Section title="Cómo se juega">
          <p>
            Hay dos formas independientes de ganar puntos. Suman ambas; tu
            puntaje final es la suma de las dos.
          </p>
          <ol className="list-decimal list-inside space-y-1.5 ml-1">
            <li>
              <strong>Predicción general</strong>: predices todo el torneo
              (grupos, eliminatorias, campeón, premios especiales).{" "}
              <strong>Se llena antes del inicio del Mundial</strong> y es
              editable hasta ese momento.
            </li>
            <li>
              <strong>Predicciones por partido</strong>: marcador de cada uno
              de los 104 partidos.{" "}
              <strong>Editable hasta 10 minutos antes del kickoff</strong> de
              cada partido. La idea es que entres{" "}
              <strong>cada día a la app</strong> y dejes los marcadores de los
              partidos que se juegan ese día.
            </li>
          </ol>
        </Section>

        <Section title="Tu rutina diaria una vez empezado el Mundial">
          <ol className="list-decimal list-inside space-y-1.5 ml-1">
            <li>
              Entra a <strong>Mi resumen</strong> y mira tus puntos del día
              anterior.
            </li>
            <li>
              Ve a <strong>Predicciones → Por partido</strong> y expande el día
              de hoy.
            </li>
            <li>
              Pon el marcador para cada partido del día (predice todos los que
              quieras, no es obligatorio).
            </li>
            <li>
              Puedes volver a editar hasta 10 min antes del kickoff de cada
              partido. Lo que no toques cuando se cierre, queda como esté.
            </li>
            <li>
              Cuando el admin cargue el resultado oficial, tus puntos aparecen
              en tu resumen y en el ranking.
            </li>
          </ol>
        </Section>

        <Section title="Predicciones por partido — cómo se ganan puntos">
          <p>
            Cada acierto suma. Se acumulan dentro del mismo partido — puedes
            ganar varios puntos a la vez.
          </p>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            <li>
              <strong>Marcador exacto a 90 min</strong>: 3 pts ×{" "}
              <em>multiplicador por etapa</em>{" "}
              (1.0 grupos · 1.5 R32 · 2.0 8vos · 2.5 4tos · 3.0 semis y 3°
              puesto · 4.0 final)
            </li>
            <li>
              <strong>Ganador o empate correcto</strong>: 2 pts
            </li>
            <li>
              <strong>Goles del equipo local correctos</strong>: 1 pt
            </li>
            <li>
              <strong>Goles del equipo visitante correctos</strong>: 1 pt
            </li>
            <li>
              <strong>Diferencia de gol exacta</strong>: 1 pt
            </li>
            <li>
              <strong>Goleada</strong> (predijiste un marcador con 3+ de
              diferencia y el equipo correcto gana por 3+ en la realidad): 1 pt.
              No hay checkbox; se deriva automáticamente de tu marcador.
            </li>
            <li>
              En eliminatorias: <strong>+2 pts</strong> si aciertas el ganador
              final (incluyendo alargue/penales). Si tu marcador predicho a 90
              min ya tiene ganador, ese se toma como tu ganador KO. Si
              predijiste empate, te preguntamos explícitamente quién gana en
              alargue/penales.
            </li>
          </ul>
          <div className="rounded-md bg-zinc-100 dark:bg-zinc-900 p-3 text-zinc-700 dark:text-zinc-300">
            <strong>Ejemplo (Final):</strong> Predijiste España 2–1 Argentina y
            el partido terminó España 2–1 a los 90 min. Sumas:
            <ul className="list-disc list-inside ml-2 mt-1 space-y-0.5">
              <li>Marcador exacto (3 × 4 = 12)</li>
              <li>Ganador correcto (2)</li>
              <li>Goles del local correctos (1)</li>
              <li>Goles del visitante correctos (1)</li>
              <li>Diferencia exacta (1)</li>
              <li>Ganador KO correcto en eliminatoria (2)</li>
            </ul>
            <p className="mt-1.5"><strong>Total: 19 pts.</strong></p>
          </div>
        </Section>

        <Section title="Predicción general (esquema completo)">
          <p>
            Una sola predicción que cubre todo el torneo. Editable hasta el
            inicio del Mundial. Se acreditan los puntos a medida que cada equipo
            avanza.
          </p>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            <li>
              Posición exacta de un equipo en su grupo (1°, 2°, 3°, 4°):{" "}
              <strong>3 pts × equipo</strong>
            </li>
            <li>Equipo que clasifica a Ronda de 32: <strong>5 pts × equipo</strong></li>
            <li>Equipo que clasifica a octavos: <strong>8 pts × equipo</strong></li>
            <li>Equipo que clasifica a cuartos: <strong>12 pts × equipo</strong></li>
            <li>Equipo que clasifica a semifinales: <strong>15 pts × equipo</strong></li>
            <li>Equipo finalista: <strong>20 pts × equipo</strong></li>
            <li><strong>Campeón</strong>: 30 pts</li>
          </ul>
        </Section>

        <Section title="Premios especiales (en la predicción general)">
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            <li><strong>Goleador del Mundial</strong>: 25 pts</li>
            <li>Balón de Oro (mejor jugador): 15 pts</li>
            <li>Guante de Oro (mejor portero): 15 pts</li>
            <li>Mejor jugador joven: 15 pts</li>
            <li>
              Equipo revelación: 15 pts (definido por el admin al final del
              torneo)
            </li>
          </ul>
        </Section>

        <Section title="Desempate">
          <ol className="list-decimal list-inside space-y-1.5 ml-1">
            <li>Más marcadores exactos acertados.</li>
            <li>Si sigue empate: más aciertos en fases finales.</li>
            <li>Si sigue empate: fecha de registro más antigua.</li>
          </ol>
        </Section>

        <Section title="Visibilidad de predicciones">
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            <li>
              Las predicciones por partido de otros participantes se ven{" "}
              <strong>solo después del cierre</strong> de cada partido (10 min
              antes del kickoff).
            </li>
            <li>
              La predicción general de otros participantes se ve{" "}
              <strong>solo después del inicio del Mundial</strong>.
            </li>
          </ul>
        </Section>

        <p className="text-xs text-zinc-500">
          Si las reglas cambian, te avisamos en la app y se aplican hacia
          adelante.
        </p>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold border-b border-zinc-200 dark:border-zinc-800 pb-1.5">
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {children}
      </div>
    </section>
  );
}
