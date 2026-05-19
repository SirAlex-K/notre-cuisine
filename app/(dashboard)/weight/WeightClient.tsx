"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Scale, Plus, Trash2 } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { WeightLog } from "@/lib/types";

interface Props {
  userId: string;
  logs: WeightLog[];
  profiles: { id: string; name: string; target_weight: number | null }[];
}

export default function WeightClient({ userId, logs, profiles }: Props) {
  const [selectedUser, setSelectedUser] = useState(userId);
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(formatDate(new Date()));
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const userLogs = logs.filter((l) => l.user_id === selectedUser);
  const profile = profiles.find((p) => p.id === selectedUser);
  const targetWeight = profile?.target_weight;
  const latestWeight = userLogs[userLogs.length - 1]?.weight;
  const firstWeight = userLogs[0]?.weight;
  const diff = latestWeight && firstWeight ? latestWeight - firstWeight : null;

  const chartData = userLogs.map((l) => ({
    date: format(new Date(l.date + "T12:00:00"), "d MMM", { locale: fr }),
    weight: l.weight,
    id: l.id,
  }));

  async function addWeight() {
    const val = parseFloat(weight);
    if (isNaN(val) || val <= 0) return;
    setSaving(true);
    await supabase.from("weight_logs").upsert({
      date,
      weight: val,
      user_id: selectedUser,
    }, { onConflict: "date,user_id" });
    setWeight("");
    setSaving(false);
    router.refresh();
  }

  async function deleteLog(id: string) {
    await supabase.from("weight_logs").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Scale className="w-6 h-6 text-brand-500" />
            Suivi du poids
          </h1>
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-900">
            {latestWeight ? `${latestWeight} kg` : "—"}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Poids actuel</div>
        </div>
        <div className="card text-center">
          <div className={cn("text-2xl font-bold", !diff ? "text-gray-900" : diff < 0 ? "text-brand-600" : "text-red-500")}>
            {diff != null ? `${diff > 0 ? "+" : ""}${diff.toFixed(1)} kg` : "—"}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Évolution</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-600">
            {targetWeight ? `${targetWeight} kg` : "—"}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Objectif</div>
        </div>
      </div>

      {/* Add entry */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-3">Enregistrer mon poids</h2>
        <div className="flex gap-2">
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <div className="relative flex-1">
            <input
              type="number"
              className="input pr-10"
              placeholder="Ex: 75.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              step="0.1"
              min="1"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">kg</span>
          </div>
          <button className="btn-primary flex items-center gap-1" onClick={addWeight} disabled={saving}>
            <Plus className="w-4 h-4" />
            {saving ? "..." : "OK"}
          </button>
        </div>
      </div>

      {/* Chart */}
      {chartData.length >= 2 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Graphique</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v}kg`}
              />
              <Tooltip
                formatter={(v: number) => [`${v} kg`, "Poids"]}
                contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
              />
              {targetWeight && (
                <ReferenceLine
                  y={targetWeight}
                  stroke="#a78bfa"
                  strokeDasharray="4 4"
                  label={{ value: `Objectif ${targetWeight}kg`, fontSize: 10, fill: "#a78bfa" }}
                />
              )}
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 4, fill: "#22c55e" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History */}
      {userLogs.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">Historique</h2>
          <div className="space-y-2">
            {[...userLogs].reverse().map((log) => (
              <div key={log.id} className="flex items-center justify-between group py-1">
                <span className="text-sm text-gray-500">
                  {format(new Date(log.date + "T12:00:00"), "EEEE d MMMM", { locale: fr })}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900">{log.weight} kg</span>
                  <button
                    onClick={() => deleteLog(log.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {userLogs.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Scale className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune mesure enregistrée</p>
        </div>
      )}
    </div>
  );
}
