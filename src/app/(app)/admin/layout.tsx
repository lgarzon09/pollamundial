import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminTabs } from "@/components/AdminTabs";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-12 text-center">
        <h1 className="text-2xl font-bold">Acceso denegado</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
          Sólo el admin de la polla puede ver esta página.
        </p>
        <Link
          href="/mi-resumen"
          className="inline-block mt-4 text-sm text-emerald-600 hover:underline"
        >
          ← Volver al inicio
        </Link>
      </main>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <AdminTabs />
      {children}
    </div>
  );
}
