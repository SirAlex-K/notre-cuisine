import { createServerSupabase } from "@/lib/supabase-server";
import { formatDate } from "@/lib/utils";
import FoodLogClient from "./FoodLogClient";

export default async function FoodLogPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const today = formatDate(new Date());

  const [{ data: logs }, { data: profiles }, { data: profile }] = await Promise.all([
    supabase.from("food_logs").select("*").eq("date", today).order("created_at", { ascending: true }),
    supabase.from("profiles").select("id, name"),
    supabase.from("profiles").select("target_calories, target_protein, target_carbs, target_fat, goal").eq("id", user.id).single(),
  ]);

  return (
    <FoodLogClient
      userId={user.id}
      today={today}
      logs={logs ?? []}
      profiles={profiles ?? []}
      targetCalories={profile?.target_calories ?? 2000}
      targetProtein={profile?.target_protein ?? null}
      targetCarbs={profile?.target_carbs ?? null}
      targetFat={profile?.target_fat ?? null}
      goal={profile?.goal ?? "maintain"}
    />
  );
}
