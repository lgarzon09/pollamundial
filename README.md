# Polla Mundial 2026

Polla del Mundial 2026 (USA · Canadá · México) entre amigos. Predice los 104 partidos, llena tu bracket completo, y compite en el ranking.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind 4
- **Supabase** (Postgres + Auth con email/password + confirmación)
- Deploy en Vercel

## Setup local

### 1) Crear proyecto Supabase

1. Ve a [supabase.com](https://supabase.com), crea un proyecto nuevo (free tier alcanza).
2. En **Authentication → Providers → Email**: deja activado el provider Email y "Confirm email".
3. En **SQL Editor**: crea una nueva query, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y ejecuta.
4. En **Settings → API**: copia `Project URL`, `anon public key`, y `service_role key`.

### 2) Configurar env vars

```sh
cp .env.local.example .env.local
# Edita .env.local con las claves de Supabase
```

### 3) Cargar datos del Mundial (seed)

```sh
# Próximamente: script para cargar equipos, grupos y los 104 partidos
```

### 4) Correr

```sh
npm install
npm run dev
# http://localhost:3000
```

## Reglas y puntuación

**Predicciones por partido** (hasta 10 min antes de cada partido):
- Marcador exacto 90 min: 3 pts × multiplicador por etapa (1.0 grupos → 4.0 final)
- Ganador / empate: 2 pts
- Goles equipo local correctos: 1 pt
- Goles equipo visitante correctos: 1 pt
- Diferencia de gol exacta: 1 pt
- Predijo "goleada" (checkbox + equipo, gana por 3+): 1 pt
- En KO, ganador final (incluye alargue/penales): +2 pts

**Esquema inicial** (deadline: inicio del Mundial):
- Posición exacta en grupo: 3 pts × equipo
- Clasifica a cada ronda (5/8/12/15/20 pts según ronda alcanzada)
- Campeón: 30 pts
- Goleador: 25 pts. Otros premios (Balón Oro, Guante Oro, Mejor joven, Equipo revelación): 15 pts c/u

**Desempate**: aciertos de marcador exacto → aciertos en fases finales → fecha de registro.

## Estructura

```
src/
├── app/
│   ├── auth/callback/     # Email confirm callback
│   ├── dashboard/         # Dashboard del usuario logueado
│   ├── login/             # Login
│   ├── signup/            # Registro
│   ├── layout.tsx
│   └── page.tsx           # Landing
├── lib/supabase/
│   ├── client.ts          # Cliente para componentes "use client"
│   ├── server.ts          # Cliente para Server Components / Server Actions
│   └── middleware.ts      # Refresh de sesión
└── middleware.ts          # Edge middleware

supabase/
└── schema.sql             # Esquema completo + RLS
```
# pollamundial
# pollamundial
# pollamundial
