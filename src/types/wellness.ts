export type ContactStatus = "active" | "inactive" | "archived";
export type ContactGender = "male" | "female" | "other" | "prefer_not_to_say";
export type LeadStage = "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
export type LeadStatus = "open" | "converted" | "lost" | "archived";
export type AppointmentStatus =
  | "scheduled" | "confirmed" | "checked_in" | "in_progress"
  | "completed" | "no_show" | "cancelled" | "rescheduled";
export type EnrollmentStatus = "active" | "paused" | "completed" | "cancelled" | "expired";
export type EnrollmentPaymentStatus =
  | "not_required" | "pending" | "paid" | "partial" | "overdue" | "refunded";
export type ProgramStatus = "draft" | "active" | "archived";
export type ProgramType = "weight_loss" | "fitness" | "nutrition" | "wellness" | "custom";
export type CarePlanStatus =
  | "draft" | "pending_approval" | "approved" | "active" | "completed" | "archived";
export type MealType =
  | "breakfast" | "morning_snack" | "lunch" | "afternoon_snack" | "dinner" | "evening_snack";
export type MealPlanStatus =
  | "draft" | "pending_approval" | "approved" | "active" | "completed" | "archived";
export type AssessmentType = "initial" | "follow_up" | "discharge" | "specialist";
export type AssessmentStatus = "draft" | "submitted" | "reviewed" | "approved";
export type CoachRole = "primary" | "secondary" | "specialist" | "temporary";
export type CoachAssignmentStatus = "active" | "completed" | "transferred" | "revoked";
export type ClientEnrollmentStatus = "registered" | "active" | "inactive" | "discharged";
export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
export type StaffStatus = "active" | "on_leave" | "terminated";
export type GoalStatus = "not_started" | "in_progress" | "achieved" | "abandoned";
export type InvoiceStatus =
  | "draft" | "sent" | "paid" | "partial" | "overdue" | "cancelled" | "refunded";

// ─── Contacts ───────────────────────────────────────────────────────────────

export interface Contact {
  id: string;
  tenant_id: string;
  auth_user_id: string | null;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: ContactGender | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  source: string | null;
  status: ContactStatus;
  assigned_to: string | null;
  custom_fields: Record<string, unknown>;
  crm_contact_id: string | null;
  crm_location_id: string | null;
  consent_given_at: string | null;
  consent_type: string | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContactInput {
  tenant_id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: ContactGender;
  address?: string;
  city?: string;
  state?: string;
  source?: string;
  assigned_to?: string;
  custom_fields?: Record<string, unknown>;
  consent_given_at?: string;
  consent_type?: string;
}

// ─── Leads ───────────────────────────────────────────────────────────────────

export interface Lead {
  id: string;
  tenant_id: string;
  contact_id: string;
  pipeline_stage: LeadStage;
  source: string | null;
  assigned_to: string | null;
  follow_up_date: string | null;
  conversion_date: string | null;
  enrollment_id: string | null;
  notes: string | null;
  status: LeadStatus;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  contacts?: Contact;
}

// ─── Staff Profiles ──────────────────────────────────────────────────────────

export interface StaffProfile {
  id: string;
  tenant_id: string;
  user_id: string;
  job_title: string | null;
  specialization: string | null;
  branch_id: string | null;
  hire_date: string | null;
  status: StaffStatus;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Services ────────────────────────────────────────────────────────────────

export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  currency: string;
  category: string | null;
  is_active: boolean;
  branch_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export interface Appointment {
  id: string;
  tenant_id: string;
  contact_id: string;
  service_id: string;
  staff_user_id: string;
  branch_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: AppointmentStatus;
  check_in_at: string | null;
  cancellation_reason: string | null;
  reminder_sent_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  contacts?: Contact;
  services?: Service;
}

// ─── Wellness Clients ─────────────────────────────────────────────────────────

export interface WellnessClient {
  id: string;
  tenant_id: string;
  contact_id: string;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  blood_type: BloodType | null;
  lifestyle_notes: string | null;
  primary_practitioner_id: string | null;
  enrollment_status: ClientEnrollmentStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  contacts?: Contact;
}

// ─── Coach Assignments ────────────────────────────────────────────────────────

export interface CoachAssignment {
  id: string;
  tenant_id: string;
  client_id: string;
  practitioner_id: string;
  role: CoachRole;
  start_date: string;
  end_date: string | null;
  status: CoachAssignmentStatus;
  assigned_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Health Assessments ───────────────────────────────────────────────────────

export interface HealthAssessment {
  id: string;
  tenant_id: string;
  client_id: string;
  assessed_by: string;
  assessment_type: AssessmentType;
  status: AssessmentStatus;
  medical_history: string | null;
  current_medications: unknown[];
  allergies: unknown[];
  existing_conditions: unknown[];
  family_history: string | null;
  lifestyle_data: Record<string, unknown>;
  height_cm: number | null;
  initial_weight_kg: number | null;
  bmi: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  practitioner_notes: string | null;
  referral_needed: boolean;
  sensitivity_level: "standard" | "restricted";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Health Measurements ──────────────────────────────────────────────────────

export interface HealthMeasurement {
  id: string;
  tenant_id: string;
  client_id: string;
  recorded_by: string;
  measurement_date: string;
  weight_kg: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  bmi: number | null;
  body_fat_pct: number | null;
  muscle_mass_pct: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  resting_heart_rate: number | null;
  sleep_hours: number | null;
  activity_minutes: number | null;
  water_ml: number | null;
  source: "manual" | "device" | "import";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Wellness Programs ────────────────────────────────────────────────────────

export interface WellnessProgram {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  duration_days: number;
  program_type: ProgramType;
  price: number;
  currency: string;
  requires_payment: boolean;
  inclusions: unknown[];
  session_credits: number;
  status: ProgramStatus;
  renewal_policy: "manual" | "auto" | "prompt";
  refund_policy: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Wellness Enrollments ─────────────────────────────────────────────────────

export interface WellnessEnrollment {
  id: string;
  tenant_id: string;
  client_id: string;
  program_id: string;
  start_date: string;
  end_date: string;
  status: EnrollmentStatus;
  sessions_used: number;
  sessions_total: number;
  pause_start: string | null;
  pause_end: string | null;
  enrolled_by: string;
  invoice_id: string | null;
  enrollment_payment_status: EnrollmentPaymentStatus;
  enrollment_payment_notes: string | null;
  enrollment_payment_ref: string | null;
  created_at: string;
  updated_at: string;
  wellness_programs?: WellnessProgram;
}

// ─── Care Plans ───────────────────────────────────────────────────────────────

export interface CarePlan {
  id: string;
  tenant_id: string;
  client_id: string;
  created_by: string;
  title: string;
  plan_type: ProgramType;
  status: CarePlanStatus;
  start_date: string | null;
  review_date: string | null;
  end_date: string | null;
  goals: unknown[];
  milestones: unknown[];
  current_version_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Food Items ───────────────────────────────────────────────────────────────

export interface FoodItem {
  id: string;
  name: string;
  name_telugu: string | null;
  name_hindi: string | null;
  category: string;
  calories_per_100g: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
  is_vegetarian: boolean;
  is_vegan: boolean;
  region: string | null;
  cuisine_type: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Meal Plans ───────────────────────────────────────────────────────────────

export interface MealPlan {
  id: string;
  tenant_id: string;
  client_id: string;
  created_by: string;
  title: string;
  start_date: string;
  end_date: string;
  status: MealPlanStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MealPlanItem {
  id: string;
  meal_plan_id: string;
  day_of_week: number;
  meal_type: MealType;
  food_item_id: string | null;
  recipe_id: string | null;
  custom_description: string | null;
  portion_size: string | null;
  calories: number | null;
  notes: string | null;
  order_index: number;
  food_items?: FoodItem;
}

// ─── Nutrition Entries ────────────────────────────────────────────────────────

export interface NutritionEntry {
  id: string;
  tenant_id: string;
  client_id: string;
  entry_date: string;
  meal_type: MealType;
  food_item_id: string | null;
  recipe_id: string | null;
  custom_description: string | null;
  portion_size: string | null;
  calories: number | null;
  notes: string | null;
  logged_by: string;
  created_at: string;
  food_items?: FoodItem;
}
