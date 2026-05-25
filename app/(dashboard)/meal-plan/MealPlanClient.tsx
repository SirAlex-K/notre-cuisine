"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, X, CalendarDays, Pencil, Check } from "lucide-react";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
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
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `a planifié "${mealName.trim()}" dans le planning`,
        url: "/meal-plan",
      }),
    });

    setAdding(null);
    setMealName("");
    setNotes("");
    setSaving(false);
    router.refresh();
  }

  function notify(message: string) {
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, url: "/meal-plan" }),
    });
  }

  async function deleteMeal(id: string, mealName: string) {
    await supabase.from("meal_plans").delete().eq("id", id);
    notify(`a supprimé "${mealName}" du planning repas`);
    router.refresh();
  }

  function startEdit(m: MealPlan) {
    setEditingId(m.id);
    setEditName(m.meal_name);
    setEditNotes(m.notes ?? "");
  }

  async function saveEdit(id: string) {
    await supabase.from("meal_plans").update({
      meal_name: editName.trim(),
      notes: editNotes.trim() || null,
    }).eq("id", id);
    notify(`a modifié "${editName.trim()}" dans le planning repas`);
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                          <div key={m.id}>
                            {editingId === m.id ? (
                              <div className="space-y-1">
                                <input
                                  autoFocus
                                  type="text"
                                  className="input text-xs py-1"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  onKeyDown={(e) => e.key === "Enter" && saveEdit(m.id)}
                                />
                                <input
                                  type="text"
                                  className="input text-xs py-1"
                                  placeholder="Notes (optionnel)"
                                  value={editNotes}
                                  onChange={(e) => setEditNotes(e.target.value)}
                                />
                                <div className="flex gap-1">
                                  <button className="btn-primary text-xs py-1 px-2 flex-1 flex items-center justify-center gap-1" onClick={() => saveEdit(m.id)}>
                                    <Check className="w-3 h-3" /> OK
                                  </button>
                                  <button className="btn-secondary text-xs py-1 px-2" onClick={() => setEditingId(null)}>
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-1">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 leading-tight">{m.meal_name}</p>
                                  {m.notes && <p className="text-xs text-gray-400">{m.notes}</p>}
                                  {profiles.length > 1 && (
                                    <p className="text-xs text-brand-500">{getUserName(m.user_id)}</p>
                                  )}
                                </div>
                                <div className="flex gap-0.5 flex-shrink-0">
                                  <button onClick={() => startEdit(m)} className="text-gray-400 hover:text-brand-500 p-1 transition-colors">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => deleteMeal(m.id, m.meal_name)} className="text-gray-400 hover:text-red-400 p-1 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
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
