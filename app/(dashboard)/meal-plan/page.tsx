import { createServerSupabase } from "@/lib/supabase-server";
import { getWeekStart, getWeekDays, formatDate, formatWeekRange } from "@/lib/utils";
import MealPlanClient from "./MealPlanClient";

export default async function MealPlanPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const weekStart = getWeekStart();
  const weekDays = getWeekDays(weekStart);
  const weekStartStr = formatDate(weekStart);
  const weekEndStr = formatDate(weekDays[6]);

  const { data: mealPlans } = await supabase
    .from("meal_plans")
    .select("*")
    .gte("date", weekStartStr)
    .lte("date", weekEndStr)
    .order("date", { ascending: true });

  const { data: profiles } = await supabase.from("profiles").select("id, name");

  return (
    <MealPlanClient
      userId={user.id}
      weekDays={weekDays.map(formatDate)}
      weekLabel={formatWeekRange(weekStart)}
      mealPlans={mealPlans ?? []}
      profiles={profiles ?? []}
    />
  );
}
