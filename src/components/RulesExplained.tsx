/**
 * Componente con todas las secciones explicativas de la polla.
 * Se usa en /page.tsx (landing) y en /reglas (para usuarios logueados).
 * Es server-safe — sin "use client".
 */
export function RulesExplained() {
  return (
    <>
      {/* 2 formas de ganar puntos */}
      <section className="px-4 sm:px-6 py-16 sm:py-24 bg-white dark:bg-zinc-950">
        <div className="max-w-5xl mx-auto space-y-10">
          <header className="text-center space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black">
              2 formas de ganar puntos
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Suman ambas. Tu puntaje que define el ranking es el{" "}
              <strong>Total = General + Por partido</strong>.
            </p>
            <p className="text-sm text-zinc-500 max-w-2xl mx-auto">
              El ranking se ordena por ese <strong>Total</strong>. En tu perfil
              y en la tabla ves las tres columnas por separado:{" "}
              <strong>Total</strong>, <strong>General</strong> y{" "}
              <strong>Por partido</strong>.
            </p>
          </header>
          <div className="grid md:grid-cols-2 gap-5">
            <FeatureCard
              emoji="🏆"
              title="Predicción general"
              subtitle="Antes del Mundial"
              accent="emerald"
              points={[
                "Predices todo el Mundial: posiciones de cada grupo, eliminatorias hasta la final, campeón y premios.",
                "Se llena una sola vez, antes del primer partido (11 de junio).",
                "Editable hasta el inicio del Mundial.",
                "Da puntos a medida que se cumple cada predicción.",
              ]}
              maxPts="~743 pts"
            />
            <FeatureCard
              emoji="⚽"
              title="Predicción por partido"
              subtitle="Día a día durante el Mundial"
              accent="sky"
              points={[
                "Predices el marcador exacto de cada uno de los 104 partidos.",
                "Editable hasta 10 minutos antes del kickoff de cada partido.",
                "Idealmente revisas cada día y dejas los marcadores del día.",
                "Múltiples categorías de aciertos por partido.",
              ]}
              maxPts="hasta 20 pts × partido"
            />
          </div>
        </div>
      </section>

      {/* Puntos por partido */}
      <section className="px-4 sm:px-6 py-16 sm:py-24 bg-zinc-50 dark:bg-zinc-900/40">
        <div className="max-w-5xl mx-auto space-y-10">
          <header className="text-center space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black">
              Puntos por partido
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Cada acierto suma. Se acumulan en el mismo partido.
            </p>
          </header>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <PointCard
              pts="3"
              suffix="× mult"
              label="Marcador exacto"
              desc="A 90 minutos. Multiplicador crece según la etapa."
              accent="emerald"
              big
            />
            <PointCard
              pts="2"
              label="Ganador o empate"
              desc="Quién gana el partido (o empate)."
              accent="sky"
            />
            <PointCard
              pts="1"
              label="Goles equipo local"
              desc="Acertaste cuántos goles hizo el local."
              accent="zinc"
            />
            <PointCard
              pts="1"
              label="Goles equipo visitante"
              desc="Acertaste cuántos goles hizo el visitante."
              accent="zinc"
            />
            <PointCard
              pts="1"
              label="Diferencia de gol"
              desc="Diferencia exacta (ej. ganó por 2)."
              accent="zinc"
            />
            <PointCard
              pts="1"
              label="Goleada (3+ goles)"
              desc="Predijiste un marcador con 3+ de diferencia y se cumplió."
              accent="zinc"
            />
            <div className="sm:col-span-2 lg:col-span-3">
              <PointCard
                pts="+2"
                label="Ganador final en eliminatorias"
                desc="En partidos KO, si tu predicción implica al equipo que finalmente gana (incluso por alargue/penales)."
                accent="amber"
                wide
              />
            </div>
          </div>

          {/* Multiplicador por etapa */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-8 space-y-5">
            <header className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold">
                Multiplicador por etapa
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                El multiplicador solo aplica al{" "}
                <strong>marcador exacto</strong> (los otros puntos son fijos).
                Cuanto más adelantada la ronda, más vale acertar.
              </p>
            </header>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <StageCard etapa="Grupos" mult="1.0" pts="3" />
              <StageCard etapa="16vos" mult="1.5" pts="4.5" />
              <StageCard etapa="8vos" mult="2.0" pts="6" />
              <StageCard etapa="4tos" mult="2.5" pts="7.5" />
              <StageCard etapa="Semis" mult="3.0" pts="9" />
              <StageCard etapa="Final" mult="4.0" pts="12" highlight />
            </div>
            <p className="text-xs text-zinc-500">
              Ejemplo: marcador exacto en cuartos = 3 × 2.5 = 7.5 pts. En la
              final = 3 × 4 = 12 pts.
            </p>
          </div>

          {/* Ejemplo concreto */}
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-5 sm:p-8 space-y-3">
            <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-200">
              💡 Ejemplo (Final): predijiste España 2–1 Argentina
            </h3>
            <p className="text-sm text-emerald-900 dark:text-emerald-100">
              El partido termina <strong>España 2–1</strong> en 90 min.
            </p>
            <ul className="text-sm text-emerald-900 dark:text-emerald-100 space-y-1">
              <li>✓ Marcador exacto: 3 × 4 = <strong>12 pts</strong></li>
              <li>✓ Ganador correcto: <strong>2 pts</strong></li>
              <li>✓ Goles del local correctos: <strong>1 pt</strong></li>
              <li>✓ Goles del visitante correctos: <strong>1 pt</strong></li>
              <li>✓ Diferencia exacta: <strong>1 pt</strong></li>
              <li>✓ Ganador KO en eliminatoria: <strong>2 pts</strong></li>
            </ul>
            <p className="text-base font-bold text-emerald-900 dark:text-emerald-200 pt-1">
              Total: 19 pts en un solo partido 🎉
            </p>
          </div>
        </div>
      </section>

      {/* Puntos por predicción general */}
      <section className="px-4 sm:px-6 py-16 sm:py-24 bg-white dark:bg-zinc-950">
        <div className="max-w-5xl mx-auto space-y-10">
          <header className="text-center space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black">
              Puntos por predicción general
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Cada equipo que llega a donde lo pusiste te suma a medida que
              avanza el torneo.
            </p>
          </header>
          <div className="space-y-3">
            <BracketPointRow
              label="Posición exacta en grupo (1°, 2°, 3°, 4°)"
              pts="3 pts × equipo"
            />
            <BracketPointRow label="Clasifica a Ronda de 32" pts="5 pts × equipo" />
            <BracketPointRow label="Clasifica a octavos" pts="8 pts × equipo" />
            <BracketPointRow label="Clasifica a cuartos" pts="12 pts × equipo" />
            <BracketPointRow label="Clasifica a semifinales" pts="15 pts × equipo" />
            <BracketPointRow label="Equipo finalista" pts="20 pts × equipo" />
            <BracketPointRow label="🏆 Campeón del Mundial" pts="30 pts" big />
          </div>

          {/* Aclaración clave: las clasificaciones se cuentan por equipo */}
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-5 sm:p-8 space-y-3">
            <h3 className="text-xl font-bold text-amber-900 dark:text-amber-200">
              ⚠️ Lo más importante de entender
            </h3>
            <p className="text-sm text-amber-900 dark:text-amber-100">
              Los puntos de avance (Ronda de 32, octavos, cuartos, semis,
              finalista) se cuentan <strong>por equipo, no por la llave
              exacta</strong>. No importa contra quién juega el equipo ni en qué
              posición quedó: solo importa si el equipo que pusiste{" "}
              <strong>realmente llegó a esa ronda</strong>.
            </p>
            <p className="text-sm text-amber-900 dark:text-amber-100">
              Ejemplo: pusiste que <strong>Sudáfrica</strong> pasaba a octavos.
              En la realidad clasificó en otra posición y jugó otra llave, pero
              igual llegó a octavos → <strong>sumas sus puntos igual</strong>.
            </p>
            <p className="text-sm text-amber-900 dark:text-amber-100">
              La <strong>única excepción</strong> es la{" "}
              <strong>posición exacta de grupo</strong> (+3): esa sí exige que el
              equipo quede en el puesto exacto que predijiste.
            </p>
          </div>
        </div>
      </section>

      {/* Premios especiales */}
      <section className="px-4 sm:px-6 py-16 sm:py-24 bg-zinc-50 dark:bg-zinc-900/40">
        <div className="max-w-5xl mx-auto space-y-10">
          <header className="text-center space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black">
              Premios especiales
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Se eligen al armar tu predicción general, una sola vez antes del
              Mundial.
            </p>
          </header>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <PrizeCard emoji="⚽" title="Goleador del Mundial" pts="25 pts" />
            <PrizeCard emoji="🥇" title="Balón de Oro (mejor jugador)" pts="15 pts" />
            <PrizeCard emoji="🧤" title="Guante de Oro (mejor portero)" pts="15 pts" />
            <PrizeCard emoji="🌟" title="Mejor jugador joven" pts="15 pts" />
            <PrizeCard emoji="🇿🇦" title="Equipo revelación" pts="15 pts" />
          </div>
        </div>
      </section>

      {/* Reglas clave */}
      <section className="px-4 sm:px-6 py-16 sm:py-24 bg-white dark:bg-zinc-950">
        <div className="max-w-4xl mx-auto space-y-10">
          <header className="text-center space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black">Reglas clave</h2>
          </header>
          <div className="space-y-4">
            <RuleRow
              icon="⏰"
              title="Cierre de cada partido"
              desc="Tus predicciones por partido se pueden editar hasta 10 minutos antes del kickoff. Después quedan congeladas."
            />
            <RuleRow
              icon="🔒"
              title="Cierre de la predicción general"
              desc="Cierra cuando inicia el primer partido del Mundial. Después de eso ya no se puede modificar."
            />
            <RuleRow
              icon="👀"
              title="Visibilidad"
              desc="Las predicciones de otros se ven cuando cierra cada partido. La predicción general de los demás se ve cuando inicia el Mundial."
            />
            <RuleRow
              icon="⚖️"
              title="Desempate"
              desc="Si dos personas tienen el mismo Total, gana quien tenga más marcadores exactos acertados. Si aún hay empate, se ordena por nombre."
            />
            <RuleRow
              icon="💸"
              title="Sin dinero en la app"
              desc="La app solo lleva los puntos y el ranking. Si hay plata de premio, se arregla por fuera entre amigos."
            />
          </div>
        </div>
      </section>
    </>
  );
}

// ============ Subcomponentes ============

function FeatureCard({
  emoji,
  title,
  subtitle,
  points,
  accent,
  maxPts,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  points: string[];
  accent: "emerald" | "sky";
  maxPts: string;
}) {
  const accentClasses = {
    emerald:
      "border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30",
    sky: "border-sky-200 dark:border-sky-900 bg-sky-50/50 dark:bg-sky-950/30",
  };
  const accentText = {
    emerald: "text-emerald-700 dark:text-emerald-400",
    sky: "text-sky-700 dark:text-sky-400",
  };
  return (
    <div
      className={`rounded-3xl border-2 p-6 sm:p-8 space-y-4 ${accentClasses[accent]}`}
    >
      <div className="text-5xl" aria-hidden>
        {emoji}
      </div>
      <div className="space-y-1">
        <p
          className={`text-xs uppercase tracking-wider font-bold ${accentText[accent]}`}
        >
          {subtitle}
        </p>
        <h3 className="text-2xl font-black">{title}</h3>
      </div>
      <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
        {points.map((p, i) => (
          <li key={i} className="flex gap-2">
            <span className={accentText[accent]} aria-hidden>
              ✓
            </span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <div
        className={`text-sm font-bold pt-2 border-t border-zinc-200 dark:border-zinc-800 ${accentText[accent]}`}
      >
        Máx posible: {maxPts}
      </div>
    </div>
  );
}

function PointCard({
  pts,
  suffix,
  label,
  desc,
  accent,
  big,
  wide,
}: {
  pts: string;
  suffix?: string;
  label: string;
  desc: string;
  accent: "emerald" | "sky" | "amber" | "zinc";
  big?: boolean;
  wide?: boolean;
}) {
  const accentClasses = {
    emerald:
      "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40",
    sky: "border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40",
    amber:
      "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40",
    zinc: "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900",
  };
  const ptsColor = {
    emerald: "text-emerald-700 dark:text-emerald-300",
    sky: "text-sky-700 dark:text-sky-300",
    amber: "text-amber-700 dark:text-amber-300",
    zinc: "text-zinc-700 dark:text-zinc-300",
  };
  return (
    <div
      className={`rounded-2xl border-2 p-5 ${accentClasses[accent]} ${
        wide ? "flex items-center gap-5" : ""
      }`}
    >
      <div
        className={`font-black ${ptsColor[accent]} ${
          big ? "text-5xl sm:text-6xl" : "text-4xl"
        } ${wide ? "shrink-0" : ""}`}
      >
        {pts}
        {suffix && <span className="text-base font-bold ml-1">{suffix}</span>}
      </div>
      <div className={wide ? "flex-1" : "mt-2 space-y-1"}>
        <div className="font-bold text-base">{label}</div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{desc}</p>
      </div>
    </div>
  );
}

function StageCard({
  etapa,
  mult,
  pts,
  highlight,
}: {
  etapa: string;
  mult: string;
  pts: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border-2 p-3 text-center space-y-1 ${
        highlight
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950 shadow-md"
          : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
      }`}
    >
      <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">
        {etapa}
      </div>
      <div className="text-lg font-bold">×{mult}</div>
      <div
        className={`text-xs font-mono ${
          highlight
            ? "text-emerald-700 dark:text-emerald-300 font-semibold"
            : "text-zinc-500"
        }`}
      >
        = {pts} pts
      </div>
    </div>
  );
}

function BracketPointRow({
  label,
  pts,
  big,
}: {
  label: string;
  pts: string;
  big?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border-2 px-5 py-4 ${
        big
          ? "border-emerald-400 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40"
          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
      }`}
    >
      <span
        className={`font-semibold ${big ? "text-lg sm:text-xl" : "text-base"}`}
      >
        {label}
      </span>
      <span
        className={`font-mono font-bold whitespace-nowrap ${
          big
            ? "text-xl sm:text-2xl text-emerald-700 dark:text-emerald-300"
            : "text-emerald-700 dark:text-emerald-400"
        }`}
      >
        {pts}
      </span>
    </div>
  );
}

function PrizeCard({
  emoji,
  title,
  pts,
  desc,
}: {
  emoji: string;
  title: string;
  pts: string;
  desc?: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-2">
      <div className="text-4xl" aria-hidden>
        {emoji}
      </div>
      <h3 className="font-bold">{title}</h3>
      {desc && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{desc}</p>
      )}
      <p className="font-mono font-bold text-emerald-700 dark:text-emerald-400 pt-1">
        {pts}
      </p>
    </div>
  );
}

function RuleRow({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-5">
      <div className="text-3xl shrink-0" aria-hidden>
        {icon}
      </div>
      <div className="space-y-1">
        <h3 className="font-bold">{title}</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{desc}</p>
      </div>
    </div>
  );
}
