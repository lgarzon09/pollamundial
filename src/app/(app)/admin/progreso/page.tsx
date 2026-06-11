import { createClient } from "@/lib/supabase/server";
import { AdminProgressList } from "@/components/AdminProgressList";

export const dynamic = "force-dynamic";

export default async function AdminProgresoPage() {
  const supabase = await createClient();
  const { data: progressRows } = await supabase.rpc("participant_progress");

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <AdminProgressList rows={(progressRows ?? []) as never} />
    </main>
  );
}
