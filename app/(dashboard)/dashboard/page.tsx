import { createServerSupabase } from "@/lib/supabase-server";
import { getWeekStart, formatDate, formatWeekRange } from "@/lib/utils";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const weekStart = formatDate(getWeekStart());
  const today = formatDate(new Date());

  const [
    { data: profile },
    { data: budget },
    { data: groceries },
    { data: todayLogs },
    { data: allProfiles },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("weekly_budgets").select("*").eq("week_start", weekStart).single(),
    supabase.from("grocery_items").select("*").eq("week_start", weekStart),
    supabase.from("food_logs").select("*").eq("user_id", user.id).eq("date", today),
    supabase.from("profiles").select("id, name"),
  ]);

  const totalSpent = (groceries ?? []).reduce((sum, g) => sum + (g.price || 0), 0);
  const totalCaloriesToday = (todayLogs ?? []).reduce((sum, l) => sum + (l.calories || 0), 0);
  const totalProtein = (todayLogs ?? []).reduce((sum, l) => sum + (l.protein || 0), 0);
  const totalCarbs = (todayLogs ?? []).reduce((sum, l) => sum + (l.carbs || 0), 0);
  const totalFat = (todayLogs ?? []).reduce((sum, l) => sum + (l.fat || 0), 0);

  return (
    <DashboardClient
      userId={user.id}
      profile={profile}
      weekLabel={formatWeekRange(getWeekStart())}
      weekStart={weekStart}
      budget={budget}
      totalSpent={totalSpent}
      totalCaloriesToday={totalCaloriesToday}
      totalProtein={totalProtein}
      totalCarbs={totalCarbs}
      totalFat={totalFat}
      profiles={allProfiles ?? []}
    />
  );
}
