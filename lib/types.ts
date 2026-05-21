export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface Profile {
  id: string;
  name: string;
  role: "user" | "partner";
  target_calories: number;
  target_weight: number | null;
  height: number | null;
  age: number | null;
  gender: "male" | "female" | null;
  activity_level: string | null;
  goal: string | null;
  target_protein: number | null;
  target_carbs: number | null;
  target_fat: number | null;
  setup_weight: number | null;
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

export interface ReceiptItem {
  id: string;
  receipt_id: string;
  name: string;
  quantity: string | null;
  price: number;
}

export interface Receipt {
  id: string;
  user_id: string;
  store_name: string | null;
  date: string | null;
  total: number;
  photo_url: string | null;
  created_at: string;
  items?: ReceiptItem[];
}
