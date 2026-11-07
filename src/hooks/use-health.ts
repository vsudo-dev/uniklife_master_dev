import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { HealthAssessment, HealthMeasurement, CarePlan } from "@/types";

// ─── Health Assessments ───────────────────────────────────────────────────────

export function useHealthAssessments(clientId: string) {
  return useQuery({
    queryKey: ["health-assessments", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("health_assessments")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as HealthAssessment[];
    },
    enabled: !!clientId,
  });
}

export function useCreateHealthAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tenant_id: string;
      client_id: string;
      assessed_by: string;
      assessment_type?: HealthAssessment["assessment_type"];
      medical_history?: string;
      height_cm?: number;
      initial_weight_kg?: number;
      blood_pressure_systolic?: number;
      blood_pressure_diastolic?: number;
      practitioner_notes?: string;
      current_medications?: unknown[];
      allergies?: unknown[];
      existing_conditions?: unknown[];
    }) => {
      const { data, error } = await supabase
        .from("health_assessments")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as HealthAssessment;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["health-assessments", data.client_id] });
    },
  });
}

// ─── Health Measurements ──────────────────────────────────────────────────────

export function useHealthMeasurements(clientId: string) {
  return useQuery({
    queryKey: ["health-measurements", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("health_measurements")
        .select("*")
        .eq("client_id", clientId)
        .order("measurement_date", { ascending: false });
      if (error) throw error;
      return data as HealthMeasurement[];
    },
    enabled: !!clientId,
  });
}

export function useLogMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tenant_id: string;
      client_id: string;
      recorded_by: string;
      measurement_date: string;
      weight_kg?: number;
      waist_cm?: number;
      hip_cm?: number;
      bmi?: number;
      body_fat_pct?: number;
      blood_pressure_systolic?: number;
      blood_pressure_diastolic?: number;
      resting_heart_rate?: number;
      sleep_hours?: number;
      activity_minutes?: number;
      water_ml?: number;
      notes?: string;
    }) => {
      const payload = { ...input, source: "manual" };
      const { data, error } = await supabase
        .from("health_measurements")
        .upsert(payload, { onConflict: "tenant_id,client_id,measurement_date,source" })
        .select()
        .single();
      if (error) throw error;
      return data as HealthMeasurement;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["health-measurements", data.client_id] });
    },
  });
}

// ─── Care Plans ───────────────────────────────────────────────────────────────

export function useCarePlans(clientId: string) {
  return useQuery({
    queryKey: ["care-plans", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_plans")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CarePlan[];
    },
    enabled: !!clientId,
  });
}

export function useCreateCarePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tenant_id: string;
      client_id: string;
      created_by: string;
      title: string;
      plan_type: CarePlan["plan_type"];
      start_date?: string;
      review_date?: string;
      goals?: unknown[];
      milestones?: unknown[];
    }) => {
      const { data, error } = await supabase
        .from("care_plans")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as CarePlan;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["care-plans", data.client_id] });
    },
  });
}
