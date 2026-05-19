"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, X, CalendarDays } from "lucide-react";
import { cn, MEAL_LABELS } from "@/lib/utils";
import type { MealPlan, MealType } from "@/lib/types";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

interface Props {
  userId: string;
  weekDays: string[];
  weekLabel: string;
  mealPlans: MealPlan[];
  profiles: { id: string; name: string }[];
}

export default function MealPlanClient({ userId, weekDays, weekLabel, mealPlans, profiles }: Props) {
  const [adding, setAdding] = useState<{ date: string; meal_type: MealType } | null>(null);
  const [mealName, setMealName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState(userId);
  const supabase = createClient();
  const router = useRouter();

  function getMealsFor(date: string, mealType: MealType) {
    return mealPlans.filter((m) => m.date === date && m.meal_type === mealType);
  }

  function getUserName(id: string) {
    return profiles.find((p) => p.id === id)?.name ?? "?";
  }

  async function addMeal() {
    if (!adding || !mealName.trim()) return;
    setSaving(true);
    await supabase.from("meal_plans").insert({
      date: adding.date,
      meal_type: adding.meal_type,
      meal_name: mealName.trim(),
      notes: notes.trim() || null,
      user_id: selectedUser,
    });
    setAdding(null);
    setMealName("");
    setNotes("");
    setSaving(false);
    router.refresh();
  }

  async function deleteMeal(id: string) {
    await supabase.from("meal_plans").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-brand-500" />
            Planning repas
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{weekLabel}</p>
        </div>
        {profiles.length > 1 && (
          <div className="flex gap-2">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedUser(p.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-sm font-medium transition-colors",
                  selectedUser === p.id ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600"
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {weekDays.map((day) => {
          const label = format(new Date(day + "T12:00:00"), "EEEE d MMM", { locale: fr });
          const isToday = day === new Date().toISOString().split("T")[0];
          return (
            <div key={day} className={cn("card", isToday && "border-brand-200 bg-brand-50/30")}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className={cn("font-semibold capitalize", isToday ? "text-brand-700" : "text-gray-800")}>
                  {label}
                </h3>
                {isToday && (
                  <span className="text-xs bg-brand-500 text-white px-2 py-0.5 rounded-full">Aujourd&apos;hui</span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {MEAL_TYPES.map((mt) => {
                  const meals = getMealsFor(day, mt);
                  const isActive = adding?.date === day && adding?.meal_type === mt;
                  return (
                    <div key={mt} className="bg-white rounded-xl border border-gray-100 p-3">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        {MEAL_LABELS[mt]}
                      </div>

                      <div className="space-y-1.5 mb-2">
                        {meals.map((m) => (
                          <div key={m.id} className="flex items-start justify-between gap-1 group">
                            <div>
                              <p className="text-sm font-medium text-gray-800 leading-tight">{m.meal_name}</p>
                              {m.notes && <p className="text-xs text-gray-400">{m.notes}</p>}
                              {profiles.length > 1 && (
                                <p className="text-xs text-brand-500">{getUserName(m.user_id)}</p>
                              )}
                            </div>
                            <button
                              onClick={() => deleteMeal(m.id)}
                              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {isActive ? (
                        <div className="space-y-1.5">
                          <input
                            autoFocus
                            type="text"
                            className="input text-xs py-1"
                            placeholder="Nom du repas"
                            value={mealName}
                            onChange={(e) => setMealName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addMeal()}
                          />
                          <input
                            type="text"
                            className="input text-xs py-1"
                            placeholder="Notes (optionnel)"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                          />
                          <div className="flex gap-1">
                            <button className="btn-primary text-xs py-1 px-2 flex-1" onClick={addMeal} disabled={saving}>
                              {saving ? "..." : "OK"}
                            </button>
                            <button
                              className="btn-secondary text-xs py-1 px-2"
                              onClick={() => { setAdding(null); setMealName(""); setNotes(""); }}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-500 transition-colors"
                          onClick={() => { setAdding({ date: day, meal_type: mt }); setMealName(""); setNotes(""); }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Ajouter
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
