import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { MealPlan, NutritionEntry, FoodItem } from "@/types";

export function useMealPlans(clientId: string) {
  return useQuery({
    queryKey: ["meal-plans", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("client_id", clientId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as MealPlan[];
    },
    enabled: !!clientId,
  });
}

export function useNutritionEntries(clientId: string, date?: string) {
  return useQuery({
    queryKey: ["nutrition-entries", clientId, date],
    queryFn: async () => {
      let q = supabase
        .from("nutrition_entries")
        .select("*, food_items(*)")
        .eq("client_id", clientId)
        .order("entry_date", { ascending: false });
      if (date) q = q.eq("entry_date", date);
      const { data, error } = await q;
      if (error) throw error;
      return data as NutritionEntry[];
    },
    enabled: !!clientId,
  });
}

export function useFoodItems(search: string) {
  return useQuery({
    queryKey: ["food-items", search],
    queryFn: async () => {
      let q = supabase
        .from("food_items")
        .select("id, name, calories_per_100g, protein_g, carbs_g, fat_g, category")
        .eq("verified", true)
        .order("name")
        .limit(30);
      if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data as Pick<FoodItem, "id" | "name" | "calories_per_100g" | "protein_g" | "carbs_g" | "fat_g" | "category">[];
    },
    enabled: search.length >= 2,
  });
}

export function useLogNutritionEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tenant_id: string;
      client_id: string;
      entry_date: string;
      meal_type: NutritionEntry["meal_type"];
      food_item_id?: string;
      custom_description?: string;
      portion_size?: string;
      calories?: number;
      notes?: string;
      logged_by: string;
    }) => {
      const { data, error } = await supabase
        .from("nutrition_entries")
        .insert(input)
        .select("*, food_items(*)")
        .single();
      if (error) throw error;
      return data as NutritionEntry;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["nutrition-entries", data.client_id] });
    },
  });
}

export function useCreateMealPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tenant_id: string;
      client_id: string;
      created_by: string;
      title: string;
      start_date: string;
      end_date: string;
    }) => {
      const { data, error } = await supabase
        .from("meal_plans")
        .insert({ ...input, status: "draft" })
        .select()
        .single();
      if (error) throw error;
      return data as MealPlan;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["meal-plans", data.client_id] });
    },
  });
}

export function useApproveMealPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, approved_by, client_id }: { id: string; approved_by: string; client_id: string }) => {
      const { data, error } = await supabase
        .from("meal_plans")
        .update({ status: "approved", approved_by, approved_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, client_id } as MealPlan & { client_id: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["meal-plans", data.client_id] });
    },
  });
}
