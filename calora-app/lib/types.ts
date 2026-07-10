// Shared types for Calora

export type FoodItem = {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type Macros = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type EstimateResult = {
  items: FoodItem[];
  totals: Macros;
  confidence: "high" | "medium" | "low";
  notes: string;
};

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type MealEntry = {
  id: string;
  loggedAt: number;
  meal: MealType;
  items: FoodItem[];
  totals: Macros;
  source: "photo" | "text";
  imageDataUrl?: string;
  notes?: string;
};

export type UserSettings = {
  goalCalories: number;
};

export type EstimateRequest = {
  image?: string; // data:image/...;base64,...
  text?: string;
  context?: { meal?: MealType };
};

export type EstimateResponse = EstimateResult;