export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface Profile {
  id: string;
  name: string;
  role: "user" | "partner";
  target_calories: number;
  target_weight: number | null;
}

export interface WeeklyBudget {
  id: string;
  week_start: string;
  amount: number;
  created_by: string;
  created_at: string;
}

export interface GroceryItem {
  id: string;
  week_start: string;
  name: string;
  quantity: string | null;
  price: number;
  checked: boolean;
  added_by: string;
  created_at: string;
}

export interface MealPlan {
  id: string;
  date: string;
  meal_type: MealType;
  meal_name: string;
  notes: string | null;
  user_id: string;
  created_at: string;
}

export interface FoodLog {
  id: string;
  date: string;
  meal_type: MealType;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  photo_url: string | null;
  user_id: string;
  created_at: string;
}

export interface WeightLog {
  id: string;
  date: string;
  weight: number;
  user_id: string;
  created_at: string;
}

export interface MacroAnalysis {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
