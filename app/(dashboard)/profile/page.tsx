import { createServerSupabase } from "@/lib/supabase-server";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: weightLogs }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("weight_logs").select("weight").eq("user_id", user.id).order("date", { ascending: false }).limit(1),
  ]);

  const latestWeight = weightLogs?.[0]?.weight ?? null;

  return <ProfileClient profile={profile} latestWeight={latestWeight} />;
}
