import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import Navbar from "@/components/Navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen">
      <Navbar userName={profile?.name ?? user.email ?? "Moi"} />
      <main className="md:ml-56 pb-20 md:pb-0 min-h-screen">
        <div className="max-w-5xl mx-auto p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
