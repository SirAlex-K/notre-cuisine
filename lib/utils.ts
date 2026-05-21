import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, startOfWeek, addDays } from "date-fns";
import { fr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 }); // Monday
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "yyyy-MM-dd");
}

export function formatDisplayDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "EEE d MMM", { locale: fr });
}

export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  return `${format(weekStart, "d MMM", { locale: fr })} – ${format(end, "d MMM yyyy", { locale: fr })}`;
}

export const MEAL_LABELS: Record<string, string> = {
  breakfast: "Petit-déj",
  lunch: "Déjeuner",
  dinner: "Dîner",
  snack: "Collation",
};

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain";
export type Gender = "male" | "female";

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sédentaire (bureau, peu de sport)",
  light: "Légèrement actif (1-3j/semaine)",
  moderate: "Modérément actif (3-5j/semaine)",
  active: "Très actif (6-7j/semaine)",
  very_active: "Athlète / travail physique",
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose: "Perte de poids",
  maintain: "Maintien",
  gain: "Prise de masse",
};

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calculateNutrition(params: {
  weight: number; // kg
  height: number; // cm
  age: number;
  gender: Gender;
  activity: ActivityLevel;
  goal: Goal;
}): { calories: number; protein: number; carbs: number; fat: number } {
  const { weight, height, age, gender, activity, goal } = params;

  // Mifflin-St Jeor
  const bmr =
    gender === "male"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activity]);

  const calories =
    goal === "lose" ? tdee - 500 : goal === "gain" ? tdee + 300 : tdee;

  // Macro splits
  const splits: Record<Goal, { p: number; c: number; f: number }> = {
    lose:     { p: 0.40, c: 0.30, f: 0.30 },
    maintain: { p: 0.30, c: 0.45, f: 0.25 },
    gain:     { p: 0.35, c: 0.45, f: 0.20 },
  };
  const s = splits[goal];
  return {
    calories,
    protein: Math.round((calories * s.p) / 4),
    carbs: Math.round((calories * s.c) / 4),
    fat: Math.round((calories * s.f) / 9),
  };
}
