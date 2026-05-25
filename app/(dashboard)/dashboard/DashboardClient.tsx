"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Wallet, Flame, Beef, Wheat, Droplets, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
  profile: { name: string; target_calories: number } | null;
  weekLabel: string;
  weekStart: string;
  budget: { id: string; amount: number } | null;
  totalSpent: number;
  totalCaloriesToday: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  profiles: { id: string; name: string }[];
}

export default function DashboardClient({
  userId,
  profile,
  weekLabel,
  weekStart,
  budget,
  totalSpent,
  totalCaloriesToday,
  totalProtein,
  totalCarbs,
  totalFat,
  profiles,
}: Props) {
  const [budgetAmount, setBudgetAmount] = useState(budget?.amount?.toString() ?? "");
  const [savingBudget, setSavingBudget] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const targetCal = profile?.target_calories ?? 2000;
  const calPercent = Math.min(100, Math.round((totalCaloriesToday / targetCal) * 100));

  async function saveBudget() {
    const amount = parseFloat(budgetAmount);
    if (isNaN(amount)) return;
    setSavingBudget(true);
    if (budget?.id) {
      await supabase.from("weekly_budgets").update({ amount }).eq("id", budget.id);
    } else {
      await supabase.from("weekly_budgets").insert({ week_start: weekStart, amount, created_by: userId });
    }
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `a défini le budget courses à ${amount.toFixed(2)}€ pour la semaine`,
        url: "/dashboard",
      }),
    });
    setSavingBudget(false);
    router.refresh();
  }

  const budgetLeft = (budget?.amount ?? 0) - totalSpent;
  const budgetPercent = budget?.amount ? Math.min(100, Math.round((totalSpent / budget.amount) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, {profile?.name ?? "toi"} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">Semaine du {weekLabel}</p>
      </div>

      {/* Budget card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold text-gray-900">Budget courses</h2>
          </div>
          <span className="text-xs text-gray-400">{weekLabel}</span>
        </div>

        <div className="flex items-end gap-3 mb-4">
          <div className="flex-1">
            <label className="label">Budget de la semaine (€)</label>
            <div className="flex gap-2">
              <input
                type="number"
                className="input"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="Ex: 150"
                step="0.01"
              />
              <button className="btn-primary whitespace-nowrap" onClick={saveBudget} disabled={savingBudget}>
                {savingBudget ? "..." : "Sauver"}
              </button>
            </div>
          </div>
        </div>

        {budget?.amount ? (
          <>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div
                className={cn("h-full rounded-full transition-all", budgetPercent > 90 ? "bg-red-400" : "bg-brand-400")}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Dépensé : <strong>{totalSpent.toFixed(2)} €</strong></span>
              <span className={cn("font-semibold", budgetLeft < 0 ? "text-red-500" : "text-brand-600")}>
                Reste : {budgetLeft.toFixed(2)} €
              </span>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400">Définis un budget pour suivre tes dépenses</p>
        )}
      </div>

      {/* Calories today */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-orange-400" />
          <h2 className="font-semibold text-gray-900">Calories aujourd&apos;hui</h2>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="text-3xl font-bold text-gray-900">{totalCaloriesToday}</div>
          <div className="text-gray-400">/ {targetCal} kcal</div>
        </div>

        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div
            className={cn("h-full rounded-full transition-all", calPercent > 100 ? "bg-red-400" : "bg-orange-400")}
            style={{ width: `${calPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MacroChip icon={<Beef className="w-3.5 h-3.5" />} label="Protéines" value={totalProtein} unit="g" color="blue" />
          <MacroChip icon={<Wheat className="w-3.5 h-3.5" />} label="Glucides" value={totalCarbs} unit="g" color="yellow" />
          <MacroChip icon={<Droplets className="w-3.5 h-3.5" />} label="Lipides" value={totalFat} unit="g" color="red" />
        </div>
      </div>

      {/* Team */}
      {profiles.length > 1 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <h2 className="font-semibold text-gray-900">L&apos;équipe</h2>
          </div>
          <div className="flex gap-3">
            {profiles.map((p) => (
              <div key={p.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <div className="w-7 h-7 rounded-full bg-brand-200 flex items-center justify-center text-brand-700 text-xs font-bold">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-700">{p.name}</span>
                {p.id === userId && <span className="text-xs text-gray-400">(moi)</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MacroChip({
  icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  color: "blue" | "yellow" | "red";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    yellow: "bg-yellow-50 text-yellow-600",
    red: "bg-red-50 text-red-500",
  };
  return (
    <div className={cn("rounded-xl p-3 text-center", colors[color])}>
      <div className="flex items-center justify-center gap-1 mb-1">{icon}</div>
      <div className="text-lg font-bold">{Math.round(value)}{unit}</div>
      <div className="text-xs opacity-70">{label}</div>
    </div>
  );
}
