import { createServerSupabase } from "@/lib/supabase-server";
import { getWeekStart, formatDate, formatWeekRange } from "@/lib/utils";
import GroceriesClient from "./GroceriesClient";

export default async function GroceriesPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const weekStart = formatDate(getWeekStart());

  const [{ data: items }, { data: budget }, { data: profiles }] = await Promise.all([
    supabase.from("grocery_items").select("*").eq("week_start", weekStart).order("created_at"),
    supabase.from("weekly_budgets").select("*").eq("week_start", weekStart).single(),
    supabase.from("profiles").select("id, name"),
  ]);

  return (
    <GroceriesClient
      userId={user.id}
      weekStart={weekStart}
      weekLabel={formatWeekRange(getWeekStart())}
      items={items ?? []}
      budget={budget}
      profiles={profiles ?? []}
    />
  );
}
