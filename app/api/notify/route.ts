import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:contact@notre-cuisine.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message, url } = await req.json();

  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  const actorName = actorProfile?.name ?? "Quelqu'un";

  const { data: otherProfiles } = await supabase
    .from("profiles")
    .select("id")
    .neq("id", user.id);

  if (!otherProfiles?.length) return NextResponse.json({ ok: true });

  const otherIds = otherProfiles.map((p) => p.id);

  await supabase.from("notifications").insert(
    otherIds.map((uid) => ({
      user_id: uid,
      actor_id: user.id,
      actor_name: actorName,
      message,
      url: url ?? "/",
      read: false,
    }))
  );

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .in("user_id", otherIds);

  const pushPayload = JSON.stringify({
    title: `🍽️ ${actorName}`,
    body: message,
    url: url ?? "/",
  });

  if (subs?.length) {
    await Promise.allSettled(
      subs.map((s) =>
        webpush.sendNotification(s.subscription, pushPayload).catch(() => null)
      )
    );
  }

  return NextResponse.json({ ok: true });
}
