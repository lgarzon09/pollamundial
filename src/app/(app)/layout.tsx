import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/Nav";

export default async function AppLayout({
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
    .select("display_name, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="flex-1 flex flex-col">
      <Nav
        displayName={profile?.display_name ?? user.email ?? ""}
        isAdmin={profile?.is_admin ?? false}
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}
