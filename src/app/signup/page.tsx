import Link from "next/link";
import { signup } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Crear cuenta</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Únete a la Polla Mundial 2026
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {decodeURIComponent(error)}
          </div>
        )}
        {message && (
          <div className="rounded-md bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            {decodeURIComponent(message)}
          </div>
        )}

        <form action={signup} className="space-y-4">
          <div>
            <label
              htmlFor="display_name"
              className="block text-sm font-medium mb-1.5"
            >
              Nombre para mostrar
            </label>
            <input
              id="display_name"
              name="display_name"
              type="text"
              required
              minLength={2}
              maxLength={40}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Cómo apareces en el ranking"
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1.5"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="mt-1 text-xs text-zinc-500">Mínimo 8 caracteres.</p>
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 transition-colors"
          >
            Crear cuenta
          </button>
        </form>

        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-semibold text-emerald-600 hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
