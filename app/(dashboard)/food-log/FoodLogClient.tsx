"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, Camera, Loader2, Trash2, ChevronDown, ChevronUp, Sparkles, Pencil, Check, X } from "lucide-react";
import { cn, MEAL_LABELS } from "@/lib/utils";
import Image from "next/image";
import type { FoodLog, MealType, MacroAnalysis } from "@/lib/types";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

interface MealSuggestion {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  why: string;
}

interface Props {
  userId: string;
  today: string;
  logs: FoodLog[];
  profiles: { id: string; name: string }[];
  targetCalories: number;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFat: number | null;
  goal: string;
}

export default function FoodLogClient({ userId, today, logs, profiles, targetCalories, targetProtein, targetCarbs, targetFat, goal }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>("lunch");
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState(userId);
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCalories, setEditCalories] = useState("");
  const [editProtein, setEditProtein] = useState("");
  const [editCarbs, setEditCarbs] = useState("");
  const [editFat, setEditFat] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const router = useRouter();

  const myLogs = logs.filter((l) => l.user_id === selectedUser);
  const totalCal = myLogs.reduce((s, l) => s + (l.calories || 0), 0);
  const totalProt = myLogs.reduce((s, l) => s + (l.protein || 0), 0);
  const totalCarbs2 = myLogs.reduce((s, l) => s + (l.carbs || 0), 0);
  const totalFat = myLogs.reduce((s, l) => s + (l.fat || 0), 0);
  const calPercent = Math.min(100, Math.round((totalCal / targetCalories) * 100));

  function getUserName(id: string) {
    return profiles.find((p) => p.id === id)?.name ?? "?";
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function analyzePhoto() {
    if (!imageFile) return;
    setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append("image", imageFile);
      const res = await fetch("/api/analyze-meal", { method: "POST", body: fd });
      const data: MacroAnalysis = await res.json();
      if (data.food_name) {
        setFoodName(data.food_name);
        setCalories(data.calories.toString());
        setProtein(data.protein.toString());
        setCarbs(data.carbs.toString());
        setFat(data.fat.toString());
      }
    } catch {}
    setAnalyzing(false);
  }

  async function saveLog() {
    if (!foodName.trim()) return;
    setSaving(true);

    let photoUrl: string | null = null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `meals/${selectedUser}/${today}-${Date.now()}.${ext}`;
      const { data: uploadData } = await supabase.storage
        .from("meal-photos")
        .upload(path, imageFile, { upsert: true });
      if (uploadData) {
        const { data: urlData } = supabase.storage.from("meal-photos").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
    }

    await supabase.from("food_logs").insert({
      date: today,
      meal_type: selectedMealType,
      food_name: foodName.trim(),
      calories: parseInt(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      photo_url: photoUrl,
      user_id: selectedUser,
    });

    setShowForm(false);
    setFoodName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setImageFile(null);
    setImagePreview(null);
    setSaving(false);
    router.refresh();
  }

  async function deleteLog(id: string) {
    await supabase.from("food_logs").delete().eq("id", id);
    router.refresh();
  }

  function startEdit(log: FoodLog) {
    setEditingId(log.id);
    setEditName(log.food_name);
    setEditCalories(log.calories?.toString() ?? "");
    setEditProtein(log.protein?.toString() ?? "");
    setEditCarbs(log.carbs?.toString() ?? "");
    setEditFat(log.fat?.toString() ?? "");
  }

  async function saveEdit(id: string) {
    await supabase.from("food_logs").update({
      food_name: editName.trim(),
      calories: parseInt(editCalories) || 0,
      protein: parseFloat(editProtein) || 0,
      carbs: parseFloat(editCarbs) || 0,
      fat: parseFloat(editFat) || 0,
    }).eq("id", id);
    setEditingId(null);
    router.refresh();
  }

  async function getSuggestions() {
    setLoadingSuggestions(true);
    setSuggestions([]);
    try {
      const res = await fetch("/api/suggest-meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          calories: targetCalories,
          protein: targetProtein ?? Math.round(targetCalories * 0.30 / 4),
          carbs: targetCarbs ?? Math.round(targetCalories * 0.45 / 4),
          fat: targetFat ?? Math.round(targetCalories * 0.25 / 9),
          caloriesEaten: totalCal,
          proteinEaten: totalProt,
          carbsEaten: totalCarbs2,
          fatEaten: totalFat,
        }),
      });
      const data = await res.json();
      if (data.suggestions) setSuggestions(data.suggestions);
    } catch {}
    setLoadingSuggestions(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-500" />
            Journal alimentaire
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Aujourd&apos;hui</p>
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

      {/* Daily summary */}
      <div className="card">
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-3xl font-bold text-gray-900">{totalCal}</span>
            <span className="text-gray-400 ml-2">/ {targetCalories} kcal</span>
          </div>
          <span className="text-sm text-gray-400">{calPercent}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className={cn("h-full rounded-full", calPercent > 100 ? "bg-red-400" : "bg-orange-400")}
            style={{ width: `${calPercent}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="bg-blue-50 rounded-xl p-2">
            <div className="font-bold text-blue-600">{Math.round(totalProt)}g{targetProtein ? <span className="font-normal text-blue-400"> / {targetProtein}g</span> : ""}</div>
            <div className="text-xs text-gray-500">Protéines</div>
          </div>
          <div className="bg-yellow-50 rounded-xl p-2">
            <div className="font-bold text-yellow-600">{Math.round(totalCarbs2)}g{targetCarbs ? <span className="font-normal text-yellow-400"> / {targetCarbs}g</span> : ""}</div>
            <div className="text-xs text-gray-500">Glucides</div>
          </div>
          <div className="bg-red-50 rounded-xl p-2">
            <div className="font-bold text-red-500">{Math.round(totalFat)}g{targetFat ? <span className="font-normal text-red-300"> / {targetFat}g</span> : ""}</div>
            <div className="text-xs text-gray-500">Lipides</div>
          </div>
        </div>

        {/* Bouton suggestions IA */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <button
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-purple-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
            onClick={getSuggestions}
            disabled={loadingSuggestions}
          >
            {loadingSuggestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loadingSuggestions ? "L'IA réfléchit..." : "Suggestions de repas IA"}
          </button>
        </div>
      </div>

      {/* Suggestions IA */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Suggestions pour toi
          </h2>
          {suggestions.map((s, i) => (
            <div key={i} className="card border-l-4 border-l-purple-400">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">{s.name}</h3>
                <span className="text-sm font-bold text-orange-500 whitespace-nowrap">{s.calories} kcal</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{s.description}</p>
              <div className="flex gap-3 text-xs text-gray-500 mb-2">
                <span className="text-blue-600 font-medium">P: {s.protein}g</span>
                <span className="text-yellow-600 font-medium">G: {s.carbs}g</span>
                <span className="text-red-500 font-medium">L: {s.fat}g</span>
              </div>
              <p className="text-xs text-purple-600 italic">💡 {s.why}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add entry */}
      <div className="card">
        <button
          className="flex items-center justify-between w-full"
          onClick={() => setShowForm(!showForm)}
        >
          <span className="font-semibold text-gray-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand-500" />
            Ajouter un repas
          </span>
          {showForm ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showForm && (
          <div className="mt-4 space-y-4">
            <div className="flex gap-2 flex-wrap">
              {MEAL_TYPES.map((mt) => (
                <button
                  key={mt}
                  onClick={() => setSelectedMealType(mt)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-sm font-medium transition-colors",
                    selectedMealType === mt ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600"
                  )}
                >
                  {MEAL_LABELS[mt]}
                </button>
              ))}
            </div>

            {/* Photo upload */}
            <div>
              <label className="label">Photo du repas</label>
              <div className="flex gap-3 items-start">
                <button
                  className="btn-secondary flex items-center gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4" />
                  {imageFile ? "Changer la photo" : "Ajouter une photo"}
                </button>
                {imageFile && !analyzing && (
                  <button
                    className="btn-primary flex items-center gap-2"
                    onClick={analyzePhoto}
                  >
                    Analyser avec IA
                  </button>
                )}
                {analyzing && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyse en cours...
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              {imagePreview && (
                <div className="mt-2 relative w-32 h-32 rounded-xl overflow-hidden">
                  <Image src={imagePreview} alt="preview" fill className="object-cover" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="label">Nom du repas *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Poulet grillé avec riz"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Calories (kcal)</label>
                <input type="number" className="input" placeholder="500" value={calories} onChange={(e) => setCalories(e.target.value)} />
              </div>
              <div>
                <label className="label">Protéines (g)</label>
                <input type="number" className="input" placeholder="30" value={protein} onChange={(e) => setProtein(e.target.value)} step="0.1" />
              </div>
              <div>
                <label className="label">Glucides (g)</label>
                <input type="number" className="input" placeholder="60" value={carbs} onChange={(e) => setCarbs(e.target.value)} step="0.1" />
              </div>
              <div>
                <label className="label">Lipides (g)</label>
                <input type="number" className="input" placeholder="15" value={fat} onChange={(e) => setFat(e.target.value)} step="0.1" />
              </div>
            </div>

            <button className="btn-primary w-full" onClick={saveLog} disabled={saving || !foodName.trim()}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        )}
      </div>

      {/* Logs grouped by meal type */}
      {MEAL_TYPES.map((mt) => {
        const typeLogs = myLogs.filter((l) => l.meal_type === mt);
        if (typeLogs.length === 0) return null;
        return (
          <div key={mt} className="card">
            <h3 className="font-semibold text-gray-700 mb-3">{MEAL_LABELS[mt]}</h3>
            <div className="space-y-3">
              {typeLogs.map((log) => (
                <div key={log.id}>
                  {editingId === log.id ? (
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <input
                        type="text"
                        className="input text-sm"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nom du repas"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" className="input text-sm" value={editCalories} onChange={(e) => setEditCalories(e.target.value)} placeholder="kcal" />
                        <input type="number" className="input text-sm" value={editProtein} onChange={(e) => setEditProtein(e.target.value)} placeholder="Prot (g)" step="0.1" />
                        <input type="number" className="input text-sm" value={editCarbs} onChange={(e) => setEditCarbs(e.target.value)} placeholder="Gluc (g)" step="0.1" />
                        <input type="number" className="input text-sm" value={editFat} onChange={(e) => setEditFat(e.target.value)} placeholder="Lip (g)" step="0.1" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(log.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-brand-500 text-white text-sm font-medium">
                          <Check className="w-4 h-4" /> Sauvegarder
                        </button>
                        <button onClick={() => setEditingId(null)} className="flex items-center justify-center px-3 py-1.5 rounded-xl bg-gray-200 text-gray-600 text-sm">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 group">
                      {log.photo_url && (
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                          <Image src={log.photo_url} alt={log.food_name} fill className="object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{log.food_name}</p>
                        <div className="flex gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                          <span className="text-orange-500 font-medium">{log.calories} kcal</span>
                          <span>P: {log.protein}g</span>
                          <span>G: {log.carbs}g</span>
                          <span>L: {log.fat}g</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(log)} className="text-gray-400 hover:text-brand-500 p-1 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteLog(log.id)} className="text-gray-400 hover:text-red-400 p-1 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {myLogs.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun repas enregistré aujourd&apos;hui</p>
        </div>
      )}
    </div>
  );
}
