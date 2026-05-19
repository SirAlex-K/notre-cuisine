import { createServerSupabase } from "@/lib/supabase-server";
import WeightClient from "./WeightClient";

export default async function WeightPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: logs }, { data: profiles }] = await Promise.all([
    supabase
      .from("weight_logs")
      .select("*")
      .order("date", { ascending: true })
      .limit(90),
    supabase.from("profiles").select("id, name, target_weight"),
  ]);

  return (
    <WeightClient
      userId={user.id}
      logs={logs ?? []}
      profiles={profiles ?? []}
    />
  );
}
