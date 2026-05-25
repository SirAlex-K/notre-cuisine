"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { User, Save, Zap, Target, Activity, Bell, BellOff, BellRing } from "lucide-react";
import { cn, calculateNutrition, ACTIVITY_LABELS, GOAL_LABELS } from "@/lib/utils";
import type { ActivityLevel, Goal, Gender } from "@/lib/utils";
import type { Profile } from "@/lib/types";

interface Props {
  profile: Profile;
  latestWeight: number | null;
}

export default function ProfileClient({ profile, latestWeight }: Props) {
  const [name, setName] = useState(profile.name ?? "");
  const [height, setHeight] = useState(profile.height?.toString() ?? "");
  const [age, setAge] = useState(profile.age?.toString() ?? "");
  const [gender, setGender] = useState<Gender>(profile.gender ?? "male");
  const [activity, setActivity] = useState<ActivityLevel>((profile.activity_level as ActivityLevel) ?? "moderate");
  const [goal, setGoal] = useState<Goal>((profile.goal as Goal) ?? "maintain");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifStatus, setNotifStatus] = useState<"unknown" | "granted" | "denied" | "default">("unknown");
  const [notifLoading, setNotifLoading] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifStatus(Notification.permission as "granted" | "denied" | "default");
    }
  }, []);

  async function enableNotifications() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setNotifLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setNotifStatus(permission as "granted" | "denied" | "default");
      if (permission !== "granted") return;
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      await fetch("/api/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
    } finally {
      setNotifLoading(false);
    }
  }

  const weight = latestWeight ?? profile.setup_weight ?? null;

  const computed =
    weight && height && age
      ? calculateNutrition({
          weight,
          height: parseFloat(height),
          age: parseInt(age),
          gender,
          activity,
          goal,
        })
      : null;

  async function save() {
    setSaving(true);
    const updates: Record<string, unknown> = {
      name: name.trim() || profile.name,
      height: parseFloat(height) || null,
      age: parseInt(age) || null,
      gender,
      activity_level: activity,
      goal,
    };

    if (computed) {
      updates.target_calories = computed.calories;
      updates.target_protein = computed.protein;
      updates.target_carbs = computed.carbs;
      updates.target_fat = computed.fat;
    }

    await supabase.from("profiles").update(updates).eq("id", profile.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <User className="w-6 h-6 text-brand-500" />
          Mon profil
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Personnalise tes objectifs nutritionnels</p>
      </div>

      {/* Infos de base */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-900">Informations personnelles</h2>

        <div>
          <label className="label">Prénom</label>
          <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton prénom" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Taille (cm)</label>
            <input type="number" className="input" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="175" min="100" max="250" />
          </div>
          <div>
            <label className="label">Âge</label>
            <input type="number" className="input" value={age} onChange={(e) => setAge(e.target.value)} placeholder="25" min="10" max="100" />
          </div>
        </div>

        <div>
          <label className="label">Sexe</label>
          <div className="flex gap-2">
            {(["male", "female"] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-sm font-medium transition-colors border",
                  gender === g ? "bg-brand-500 text-white border-brand-500" : "bg-white text-gray-600 border-gray-200"
                )}
              >
                {g === "male" ? "👨 Homme" : "👩 Femme"}
              </button>
            ))}
          </div>
        </div>

        {weight ? (
          <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
            ⚖️ Poids utilisé pour le calcul : <strong>{weight} kg</strong>
            {latestWeight ? " (dernière mesure)" : " (non renseigné — ajoute ton poids dans l'onglet Poids)"}
          </p>
        ) : (
          <p className="text-sm text-orange-500 bg-orange-50 rounded-xl px-3 py-2">
            ⚠️ Ajoute ton poids dans l&apos;onglet <strong>Poids</strong> pour que le calcul soit précis.
          </p>
        )}
      </div>

      {/* Activité */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-500" />
          Niveau d&apos;activité
        </h2>
        <div className="space-y-2">
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setActivity(lvl)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl text-sm transition-colors border",
                activity === lvl ? "bg-brand-50 border-brand-300 text-brand-700 font-medium" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              {ACTIVITY_LABELS[lvl]}
            </button>
          ))}
        </div>
      </div>

      {/* Objectif */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Target className="w-4 h-4 text-brand-500" />
          Objectif sportif
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
            <button
              key={g}
              onClick={() => setGoal(g)}
              className={cn(
                "py-3 rounded-xl text-sm font-medium transition-colors border",
                goal === g ? "bg-brand-500 text-white border-brand-500" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              )}
            >
              {g === "lose" ? "🔥" : g === "maintain" ? "⚖️" : "💪"} {GOAL_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      {/* Résultat calculé */}
      {computed ? (
        <div className="card bg-gradient-to-br from-brand-50 to-green-50 border-brand-200">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold text-brand-800">Tes objectifs calculés</h2>
          </div>
          <div className="text-center mb-4">
            <div className="text-4xl font-bold text-brand-700">{computed.calories}</div>
            <div className="text-sm text-brand-500">kcal / jour</div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-blue-50 rounded-xl p-3">
              <div className="text-xl font-bold text-blue-600">{computed.protein}g</div>
              <div className="text-xs text-gray-500">Protéines</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3">
              <div className="text-xl font-bold text-yellow-600">{computed.carbs}g</div>
              <div className="text-xs text-gray-500">Glucides</div>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <div className="text-xl font-bold text-red-500">{computed.fat}g</div>
              <div className="text-xs text-gray-500">Lipides</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card bg-gray-50 border-dashed text-center py-6 text-gray-400">
          <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Remplis ta taille, ton âge et ajoute ton poids<br/>pour voir tes objectifs calculés automatiquement</p>
        </div>
      )}

      {/* Notifications */}
      {notifStatus !== "unknown" && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-brand-500" />
            Notifications push
          </h2>
          {notifStatus === "granted" ? (
            <div className="flex items-center gap-3 bg-green-50 rounded-xl px-4 py-3">
              <BellRing className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">Notifications activées ✓</p>
                <p className="text-xs text-green-600">Tu reçois les alertes quand l&apos;autre personne ajoute un repas.</p>
              </div>
            </div>
          ) : notifStatus === "denied" ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 bg-red-50 rounded-xl px-4 py-3">
                <BellOff className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">Notifications bloquées</p>
                  <p className="text-xs text-red-600">Tu as refusé la permission. Pour l&apos;activer :</p>
                </div>
              </div>
              <div className="text-xs text-gray-500 bg-gray-50 rounded-xl px-4 py-3 space-y-1">
                <p><strong>Android Chrome :</strong> Clique sur le 🔒 dans la barre d&apos;adresse → Autorisations du site → Notifications → Autoriser</p>
                <p><strong>iPhone Safari :</strong> Réglages → Safari → notre-cuisine.vercel.app → Notifications → Autoriser</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Reçois une notification dès que l&apos;autre personne ajoute un repas.</p>
              <button
                onClick={enableNotifications}
                disabled={notifLoading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Bell className="w-4 h-4" />
                {notifLoading ? "Activation..." : "Activer les notifications"}
              </button>
            </div>
          )}
        </div>
      )}

      <button
        className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        onClick={save}
        disabled={saving}
      >
        {saving ? "Enregistrement..." : saved ? "✅ Sauvegardé !" : <><Save className="w-4 h-4" /> Sauvegarder mon profil</>}
      </button>
    </div>
  );
}
