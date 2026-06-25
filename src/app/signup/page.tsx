import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Inscripciones cerradas</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Ya no se pueden crear cuentas nuevas para la Polla Mundial 2026.
          </p>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
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
