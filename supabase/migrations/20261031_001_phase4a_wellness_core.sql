-- Phase 4A–4G: Wellness Core — all tables
-- 4A: contacts, leads, lead_activities, documents, wellness_clients, coach_assignments, staff_profiles
-- 4B: services, availability_slots, appointments
-- 4C: wellness_programs, wellness_enrollments
-- 4D: health_assessments
-- 4E: health_measurements
-- 4F: care_plans, care_plan_versions
-- 4G: food_items, recipes, recipe_ingredients, meal_plans, meal_plan_items, nutrition_entries

-- ============================================================
-- DOMAIN 2: Shared Business Core
-- ============================================================

-- contacts
CREATE TABLE contacts (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  auth_user_id     UUID,
  first_name       TEXT NOT NULL,
  last_name        TEXT,
  email            TEXT,
  phone            TEXT,
  date_of_birth    DATE,
  gender           TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  address          TEXT,
  city             TEXT,
  state            TEXT,
  country          TEXT DEFAULT 'IN',
  source           TEXT,
  status           TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'archived')),
  assigned_to      UUID REFERENCES platform_users(id),
  custom_fields    JSONB NOT NULL DEFAULT '{}',
  consent_given_at TIMESTAMPTZ,
  consent_type     TEXT,
  created_by       UUID REFERENCES platform_users(id),
  updated_by       UUID REFERENCES platform_users(id),
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_contacts_unique_email
  ON contacts(tenant_id, email) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_contacts_unique_auth
  ON contacts(tenant_id, auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX idx_contacts_tenant   ON contacts(tenant_id);
CREATE INDEX idx_contacts_auth     ON contacts(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX idx_contacts_assigned ON contacts(tenant_id, assigned_to);
CREATE INDEX idx_contacts_search   ON contacts(tenant_id, first_name, last_name);

CREATE TRIGGER set_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- leads
CREATE TABLE leads (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  contact_id      UUID NOT NULL REFERENCES contacts(id),
  pipeline_stage  TEXT NOT NULL DEFAULT 'new'
    CHECK (pipeline_stage IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  source          TEXT,
  assigned_to     UUID REFERENCES platform_users(id),
  follow_up_date  TIMESTAMPTZ,
  conversion_date TIMESTAMPTZ,
  enrollment_id   UUID,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'converted', 'lost', 'archived')),
  created_by      UUID REFERENCES platform_users(id),
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_leads_unique_open
  ON leads(tenant_id, contact_id) WHERE status = 'open';
CREATE INDEX idx_leads_tenant   ON leads(tenant_id);
CREATE INDEX idx_leads_stage    ON leads(tenant_id, pipeline_stage);
CREATE INDEX idx_leads_assigned ON leads(tenant_id, assigned_to);

CREATE TRIGGER set_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- lead_activities
CREATE TABLE lead_activities (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id       UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  activity_type TEXT NOT NULL,
  description   TEXT,
  performed_by  UUID NOT NULL REFERENCES platform_users(id),
  performed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_activities_lead   ON lead_activities(lead_id, performed_at DESC);
CREATE INDEX idx_lead_activities_tenant ON lead_activities(tenant_id);

-- documents
CREATE TABLE documents (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  contact_id       UUID REFERENCES contacts(id),
  uploaded_by      UUID NOT NULL REFERENCES platform_users(id),
  file_name        TEXT NOT NULL,
  file_path        TEXT NOT NULL,
  file_type        TEXT NOT NULL,
  file_size_bytes  BIGINT NOT NULL CHECK (file_size_bytes > 0),
  category         TEXT,
  access_level     TEXT NOT NULL DEFAULT 'private'
    CHECK (access_level IN ('public', 'private', 'restricted')),
  storage_bucket   TEXT NOT NULL DEFAULT 'documents',
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_tenant  ON documents(tenant_id);
CREATE INDEX idx_documents_contact ON documents(contact_id);

-- staff_profiles
CREATE TABLE staff_profiles (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  user_id        UUID NOT NULL REFERENCES platform_users(id),
  job_title      TEXT,
  specialization TEXT,
  branch_id      UUID REFERENCES branches(id),
  hire_date      DATE,
  status         TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'on_leave', 'terminated')),
  bio            TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, user_id)
);

CREATE INDEX idx_staff_tenant ON staff_profiles(tenant_id);

CREATE TRIGGER set_staff_profiles_updated_at
  BEFORE UPDATE ON staff_profiles
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- services (4B)
CREATE TABLE services (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  name             TEXT NOT NULL,
  description      TEXT,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  price            NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT 'INR',
  category         TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  branch_id        UUID REFERENCES branches(id),
  created_by       UUID REFERENCES platform_users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_services_unique_name
  ON services(tenant_id, name) WHERE branch_id IS NULL;
CREATE INDEX idx_services_tenant ON services(tenant_id);

CREATE TRIGGER set_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- availability_slots (4B)
CREATE TABLE availability_slots (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  staff_user_id UUID NOT NULL REFERENCES platform_users(id),
  service_id    UUID REFERENCES services(id),
  branch_id     UUID NOT NULL REFERENCES branches(id),
  day_of_week   INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  is_available  BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (end_time > start_time)
);

CREATE INDEX idx_availability_staff ON availability_slots(tenant_id, staff_user_id, day_of_week);

-- appointments (4B)
CREATE TABLE appointments (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  contact_id          UUID NOT NULL REFERENCES contacts(id),
  service_id          UUID NOT NULL REFERENCES services(id),
  staff_user_id       UUID NOT NULL REFERENCES platform_users(id),
  branch_id           UUID NOT NULL REFERENCES branches(id),
  scheduled_at        TIMESTAMPTZ NOT NULL,
  duration_minutes    INT NOT NULL CHECK (duration_minutes > 0),
  status              TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','confirmed','checked_in','in_progress','completed','no_show','cancelled','rescheduled')),
  check_in_at         TIMESTAMPTZ,
  cancellation_reason TEXT,
  reminder_sent_at    TIMESTAMPTZ,
  notes               TEXT,
  booking_lock_token  UUID,
  booking_lock_until  TIMESTAMPTZ,
  created_by          UUID REFERENCES platform_users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointments_tenant     ON appointments(tenant_id);
CREATE INDEX idx_appointments_staff_date ON appointments(staff_user_id, scheduled_at);
CREATE INDEX idx_appointments_contact    ON appointments(contact_id, scheduled_at DESC);
CREATE INDEX idx_appointments_slot       ON appointments(staff_user_id, scheduled_at, duration_minutes)
  WHERE status NOT IN ('cancelled', 'rescheduled');

CREATE TRIGGER set_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================
-- DOMAIN 3: WellnessOS
-- ============================================================

-- wellness_clients (4A)
CREATE TABLE wellness_clients (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  contact_id              UUID NOT NULL REFERENCES contacts(id),
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  blood_type              TEXT CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  lifestyle_notes         TEXT,
  primary_practitioner_id UUID REFERENCES platform_users(id),
  enrollment_status       TEXT NOT NULL DEFAULT 'registered'
    CHECK (enrollment_status IN ('registered', 'active', 'inactive', 'discharged')),
  created_by              UUID REFERENCES platform_users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, contact_id)
);

CREATE INDEX idx_wellness_clients_tenant       ON wellness_clients(tenant_id);
CREATE INDEX idx_wellness_clients_contact      ON wellness_clients(contact_id);
CREATE INDEX idx_wellness_clients_practitioner ON wellness_clients(primary_practitioner_id);

CREATE TRIGGER set_wellness_clients_updated_at
  BEFORE UPDATE ON wellness_clients
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- coach_assignments (4A)
CREATE TABLE coach_assignments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  client_id       UUID NOT NULL REFERENCES wellness_clients(id),
  practitioner_id UUID NOT NULL REFERENCES platform_users(id),
  role            TEXT NOT NULL DEFAULT 'primary'
    CHECK (role IN ('primary', 'secondary', 'specialist', 'temporary')),
  start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date        DATE,
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'transferred', 'revoked')),
  assigned_by     UUID NOT NULL REFERENCES platform_users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_coach_assign_tenant      ON coach_assignments(tenant_id);
CREATE INDEX idx_coach_assign_client      ON coach_assignments(client_id, status);
CREATE INDEX idx_coach_assign_practitioner ON coach_assignments(practitioner_id, status);
CREATE INDEX idx_coach_assign_access
  ON coach_assignments(tenant_id, client_id, practitioner_id, status)
  WHERE status = 'active';

CREATE TRIGGER set_coach_assignments_updated_at
  BEFORE UPDATE ON coach_assignments
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- health_assessments (4D)
CREATE TABLE health_assessments (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id                UUID NOT NULL REFERENCES tenants(id),
  client_id                UUID NOT NULL REFERENCES wellness_clients(id),
  assessed_by              UUID NOT NULL REFERENCES platform_users(id),
  assessment_type          TEXT NOT NULL DEFAULT 'initial'
    CHECK (assessment_type IN ('initial', 'follow_up', 'discharge', 'specialist')),
  status                   TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved')),
  medical_history          TEXT,
  current_medications      JSONB NOT NULL DEFAULT '[]',
  allergies                JSONB NOT NULL DEFAULT '[]',
  existing_conditions      JSONB NOT NULL DEFAULT '[]',
  family_history           TEXT,
  lifestyle_data           JSONB NOT NULL DEFAULT '{}',
  height_cm                NUMERIC(5,1),
  initial_weight_kg        NUMERIC(5,1),
  bmi                      NUMERIC(4,1),
  blood_pressure_systolic  INT,
  blood_pressure_diastolic INT,
  practitioner_notes       TEXT,
  referral_needed          BOOLEAN NOT NULL DEFAULT false,
  sensitivity_level        TEXT NOT NULL DEFAULT 'standard'
    CHECK (sensitivity_level IN ('standard', 'restricted')),
  reviewed_by              UUID REFERENCES platform_users(id),
  reviewed_at              TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assessments_tenant ON health_assessments(tenant_id);
CREATE INDEX idx_assessments_client ON health_assessments(client_id, created_at DESC);
CREATE INDEX idx_assessments_access ON health_assessments(tenant_id, client_id);

CREATE TRIGGER set_health_assessments_updated_at
  BEFORE UPDATE ON health_assessments
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- health_measurements (4E)
CREATE TABLE health_measurements (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id                UUID NOT NULL REFERENCES tenants(id),
  client_id                UUID NOT NULL REFERENCES wellness_clients(id),
  recorded_by              UUID NOT NULL REFERENCES platform_users(id),
  measurement_date         DATE NOT NULL,
  weight_kg                NUMERIC(5,1),
  waist_cm                 NUMERIC(5,1),
  hip_cm                   NUMERIC(5,1),
  chest_cm                 NUMERIC(5,1),
  arm_cm                   NUMERIC(5,1),
  thigh_cm                 NUMERIC(5,1),
  bmi                      NUMERIC(4,1),
  body_fat_pct             NUMERIC(4,1),
  muscle_mass_pct          NUMERIC(4,1),
  blood_pressure_systolic  INT,
  blood_pressure_diastolic INT,
  resting_heart_rate       INT,
  sleep_hours              NUMERIC(3,1),
  activity_minutes         INT,
  water_ml                 INT,
  source                   TEXT DEFAULT 'manual'
    CHECK (source IN ('manual', 'device', 'import')),
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, client_id, measurement_date, source)
);

CREATE INDEX idx_measurements_client ON health_measurements(client_id, measurement_date DESC);
CREATE INDEX idx_measurements_tenant ON health_measurements(tenant_id);

-- care_plans (4F)
CREATE TABLE care_plans (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id          UUID NOT NULL REFERENCES tenants(id),
  client_id          UUID NOT NULL REFERENCES wellness_clients(id),
  created_by         UUID NOT NULL REFERENCES platform_users(id),
  title              TEXT NOT NULL,
  plan_type          TEXT NOT NULL
    CHECK (plan_type IN ('weight_loss', 'fitness', 'nutrition', 'wellness', 'custom')),
  status             TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'active', 'completed', 'archived')),
  start_date         DATE,
  review_date        DATE,
  end_date           DATE,
  goals              JSONB NOT NULL DEFAULT '[]',
  milestones         JSONB NOT NULL DEFAULT '[]',
  current_version_id UUID,
  approved_by        UUID REFERENCES platform_users(id),
  approved_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (status != 'approved' OR approved_by IS NOT NULL),
  CHECK (status != 'active' OR (start_date IS NOT NULL AND approved_by IS NOT NULL))
);

CREATE INDEX idx_care_plans_client ON care_plans(client_id, status);
CREATE INDEX idx_care_plans_tenant ON care_plans(tenant_id);

CREATE TRIGGER set_care_plans_updated_at
  BEFORE UPDATE ON care_plans
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- care_plan_versions (4F)
CREATE TABLE care_plan_versions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  care_plan_id    UUID NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
  version_number  INT NOT NULL CHECK (version_number > 0),
  content         JSONB NOT NULL,
  changes_summary TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'superseded')),
  created_by      UUID NOT NULL REFERENCES platform_users(id),
  approved_by     UUID REFERENCES platform_users(id),
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (care_plan_id, version_number),
  CHECK (status != 'approved' OR approved_by IS NOT NULL)
);

ALTER TABLE care_plans
  ADD CONSTRAINT fk_care_plans_version
  FOREIGN KEY (current_version_id) REFERENCES care_plan_versions(id);

-- wellness_programs (4C)
CREATE TABLE wellness_programs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  name            TEXT NOT NULL,
  description     TEXT,
  duration_days   INT NOT NULL CHECK (duration_days > 0),
  program_type    TEXT NOT NULL
    CHECK (program_type IN ('weight_loss', 'fitness', 'nutrition', 'wellness', 'custom')),
  price           NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'INR',
  requires_payment BOOLEAN NOT NULL DEFAULT false,
  inclusions      JSONB NOT NULL DEFAULT '[]',
  session_credits INT NOT NULL DEFAULT 0 CHECK (session_credits >= 0),
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  renewal_policy  TEXT DEFAULT 'manual'
    CHECK (renewal_policy IN ('manual', 'auto', 'prompt')),
  refund_policy   TEXT,
  created_by      UUID REFERENCES platform_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_programs_unique_name
  ON wellness_programs(tenant_id, name) WHERE status != 'archived';
CREATE INDEX idx_programs_tenant ON wellness_programs(tenant_id, status);

CREATE TRIGGER set_wellness_programs_updated_at
  BEFORE UPDATE ON wellness_programs
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- invoices (needed for enrollment FK)
CREATE TABLE invoices (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  contact_id      UUID NOT NULL REFERENCES contacts(id),
  invoice_number  TEXT NOT NULL,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'INR',
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled', 'refunded')),
  due_date        DATE,
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  created_by      UUID REFERENCES platform_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, invoice_number)
);

CREATE INDEX idx_invoices_tenant  ON invoices(tenant_id);
CREATE INDEX idx_invoices_contact ON invoices(contact_id);

CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- wellness_enrollments (4C)
CREATE TABLE wellness_enrollments (
  id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),
  client_id                 UUID NOT NULL REFERENCES wellness_clients(id),
  program_id                UUID NOT NULL REFERENCES wellness_programs(id),
  start_date                DATE NOT NULL,
  end_date                  DATE NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'expired')),
  sessions_used             INT NOT NULL DEFAULT 0 CHECK (sessions_used >= 0),
  sessions_total            INT NOT NULL DEFAULT 0 CHECK (sessions_total >= 0),
  pause_start               DATE,
  pause_end                 DATE,
  enrolled_by               UUID NOT NULL REFERENCES platform_users(id),
  invoice_id                UUID REFERENCES invoices(id),
  enrollment_payment_status TEXT NOT NULL DEFAULT 'not_required'
    CHECK (enrollment_payment_status IN (
      'not_required', 'pending', 'paid', 'partial', 'overdue', 'refunded'
    )),
  enrollment_payment_notes  TEXT,
  enrollment_payment_ref    TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (end_date >= start_date),
  CHECK (sessions_used <= sessions_total OR sessions_total = 0),
  CHECK (status != 'paused' OR pause_start IS NOT NULL)
);

CREATE INDEX idx_enrollments_client  ON wellness_enrollments(client_id, status);
CREATE INDEX idx_enrollments_tenant  ON wellness_enrollments(tenant_id);
CREATE INDEX idx_enrollments_program ON wellness_enrollments(program_id);

CREATE TRIGGER set_enrollments_updated_at
  BEFORE UPDATE ON wellness_enrollments
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- Add FK from leads to enrollments
ALTER TABLE leads
  ADD CONSTRAINT fk_leads_enrollment
  FOREIGN KEY (enrollment_id) REFERENCES wellness_enrollments(id);

-- food_items (4G — global reference table)
CREATE TABLE food_items (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name              TEXT NOT NULL,
  name_telugu       TEXT,
  name_hindi        TEXT,
  category          TEXT NOT NULL,
  calories_per_100g NUMERIC(6,1) NOT NULL CHECK (calories_per_100g >= 0),
  protein_g         NUMERIC(5,1) NOT NULL DEFAULT 0,
  carbs_g           NUMERIC(5,1) NOT NULL DEFAULT 0,
  fat_g             NUMERIC(5,1) NOT NULL DEFAULT 0,
  fiber_g           NUMERIC(5,1) NOT NULL DEFAULT 0,
  sodium_mg         NUMERIC(6,1) NOT NULL DEFAULT 0,
  is_vegetarian     BOOLEAN NOT NULL DEFAULT false,
  is_vegan          BOOLEAN NOT NULL DEFAULT false,
  region            TEXT,
  cuisine_type      TEXT,
  verified          BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_food_items_category ON food_items(category);
CREATE INDEX idx_food_items_search   ON food_items(name);
CREATE INDEX idx_food_items_region   ON food_items(region) WHERE region IS NOT NULL;

-- recipes (4G)
CREATE TABLE recipes (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id      UUID REFERENCES tenants(id),
  name           TEXT NOT NULL,
  description    TEXT,
  prep_time_min  INT CHECK (prep_time_min >= 0),
  cook_time_min  INT CHECK (cook_time_min >= 0),
  servings       INT NOT NULL DEFAULT 1 CHECK (servings > 0),
  total_calories NUMERIC(7,1),
  meal_type      TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'beverage')),
  dietary_tags   TEXT[] NOT NULL DEFAULT '{}',
  instructions   TEXT,
  image_url      TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_by     UUID REFERENCES platform_users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipes_tenant ON recipes(tenant_id) WHERE tenant_id IS NOT NULL;

-- recipe_ingredients (4G)
CREATE TABLE recipe_ingredients (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id    UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  food_item_id UUID REFERENCES food_items(id),
  custom_name  TEXT,
  quantity     NUMERIC(7,2) NOT NULL,
  unit         TEXT NOT NULL,
  calories     NUMERIC(6,1),
  order_index  INT NOT NULL DEFAULT 0,

  CHECK (food_item_id IS NOT NULL OR custom_name IS NOT NULL)
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

-- meal_plans (4G)
CREATE TABLE meal_plans (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  client_id   UUID NOT NULL REFERENCES wellness_clients(id),
  created_by  UUID NOT NULL REFERENCES platform_users(id),
  title       TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'active', 'completed', 'archived')),
  approved_by UUID REFERENCES platform_users(id),
  approved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (end_date >= start_date)
);

CREATE INDEX idx_meal_plans_client ON meal_plans(client_id, status);
CREATE INDEX idx_meal_plans_tenant ON meal_plans(tenant_id);

CREATE TRIGGER set_meal_plans_updated_at
  BEFORE UPDATE ON meal_plans
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- meal_plan_items (4G)
CREATE TABLE meal_plan_items (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_plan_id       UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  day_of_week        INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  meal_type          TEXT NOT NULL
    CHECK (meal_type IN ('breakfast','morning_snack','lunch','afternoon_snack','dinner','evening_snack')),
  food_item_id       UUID REFERENCES food_items(id),
  recipe_id          UUID REFERENCES recipes(id),
  custom_description TEXT,
  portion_size       TEXT,
  calories           NUMERIC(6,1),
  notes              TEXT,
  order_index        INT NOT NULL DEFAULT 0,

  CHECK (food_item_id IS NOT NULL OR recipe_id IS NOT NULL OR custom_description IS NOT NULL)
);

CREATE INDEX idx_meal_plan_items_plan ON meal_plan_items(meal_plan_id);

-- nutrition_entries (4G — food diary)
CREATE TABLE nutrition_entries (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id          UUID NOT NULL REFERENCES tenants(id),
  client_id          UUID NOT NULL REFERENCES wellness_clients(id),
  entry_date         DATE NOT NULL,
  meal_type          TEXT NOT NULL
    CHECK (meal_type IN ('breakfast','morning_snack','lunch','afternoon_snack','dinner','evening_snack')),
  food_item_id       UUID REFERENCES food_items(id),
  recipe_id          UUID REFERENCES recipes(id),
  custom_description TEXT,
  portion_size       TEXT,
  calories           NUMERIC(6,1),
  notes              TEXT,
  logged_by          UUID NOT NULL REFERENCES platform_users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nutrition_entries_client ON nutrition_entries(client_id, entry_date DESC);
CREATE INDEX idx_nutrition_entries_tenant ON nutrition_entries(tenant_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_entries ENABLE ROW LEVEL SECURITY;

-- Standard tenant-scoped policy helper
-- Contacts: tenant members can read, staff/admin can write
CREATE POLICY "contacts_select" ON contacts FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "contacts_insert" ON contacts FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "contacts_update" ON contacts FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()))
  WITH CHECK (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "contacts_delete" ON contacts FOR DELETE TO authenticated
  USING (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin', 'practitioner', 'staff'));

-- Leads
CREATE POLICY "leads_select" ON leads FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "leads_insert" ON leads FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "leads_update" ON leads FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()))
  WITH CHECK (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));

-- Lead activities
CREATE POLICY "lead_activities_select" ON lead_activities FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "lead_activities_insert" ON lead_activities FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));

-- Documents
CREATE POLICY "documents_select" ON documents FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "documents_insert" ON documents FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "documents_delete" ON documents FOR DELETE TO authenticated
  USING (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin'));

-- Staff profiles
CREATE POLICY "staff_profiles_select" ON staff_profiles FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "staff_profiles_insert" ON staff_profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin'));
CREATE POLICY "staff_profiles_update" ON staff_profiles FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin'))
  WITH CHECK (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin'));

-- Services
CREATE POLICY "services_select" ON services FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "services_insert" ON services FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin'));
CREATE POLICY "services_update" ON services FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin'))
  WITH CHECK (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin'));

-- Availability slots
CREATE POLICY "availability_select" ON availability_slots FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "availability_insert" ON availability_slots FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin', 'practitioner', 'staff'));
CREATE POLICY "availability_update" ON availability_slots FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()))
  WITH CHECK (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));

-- Appointments
CREATE POLICY "appointments_select" ON appointments FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "appointments_insert" ON appointments FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "appointments_update" ON appointments FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()))
  WITH CHECK (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));

-- Wellness clients
CREATE POLICY "wellness_clients_select" ON wellness_clients FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "wellness_clients_insert" ON wellness_clients FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin', 'practitioner', 'staff'));
CREATE POLICY "wellness_clients_update" ON wellness_clients FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()))
  WITH CHECK (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));

-- Coach assignments
CREATE POLICY "coach_assign_select" ON coach_assignments FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "coach_assign_insert" ON coach_assignments FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin'));
CREATE POLICY "coach_assign_update" ON coach_assignments FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin'))
  WITH CHECK (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin'));

-- Health assessments — STRICTER: only assigned practitioner or tenant_admin can read
CREATE POLICY "health_assess_select" ON health_assessments FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR public.tenant_role(tenant_id) = 'tenant_admin'
    OR EXISTS (
      SELECT 1 FROM coach_assignments ca
      WHERE ca.client_id = health_assessments.client_id
        AND ca.practitioner_id = public.platform_user_id()
        AND ca.status = 'active'
    )
  );
CREATE POLICY "health_assess_insert" ON health_assessments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR public.tenant_role(tenant_id) IN ('tenant_admin', 'practitioner')
  );
CREATE POLICY "health_assess_update" ON health_assessments FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR public.tenant_role(tenant_id) = 'tenant_admin'
    OR EXISTS (
      SELECT 1 FROM coach_assignments ca
      WHERE ca.client_id = health_assessments.client_id
        AND ca.practitioner_id = public.platform_user_id()
        AND ca.status = 'active'
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.tenant_role(tenant_id) IN ('tenant_admin', 'practitioner')
  );

-- Health measurements — same strict access
CREATE POLICY "health_meas_select" ON health_measurements FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR public.tenant_role(tenant_id) = 'tenant_admin'
    OR EXISTS (
      SELECT 1 FROM coach_assignments ca
      WHERE ca.client_id = health_measurements.client_id
        AND ca.practitioner_id = public.platform_user_id()
        AND ca.status = 'active'
    )
  );
CREATE POLICY "health_meas_insert" ON health_measurements FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR public.tenant_role(tenant_id) IN ('tenant_admin', 'practitioner', 'staff')
  );
CREATE POLICY "health_meas_update" ON health_measurements FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()))
  WITH CHECK (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));

-- Care plans — practitioner-gated read
CREATE POLICY "care_plans_select" ON care_plans FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR public.tenant_role(tenant_id) = 'tenant_admin'
    OR EXISTS (
      SELECT 1 FROM coach_assignments ca
      WHERE ca.client_id = care_plans.client_id
        AND ca.practitioner_id = public.platform_user_id()
        AND ca.status = 'active'
    )
  );
CREATE POLICY "care_plans_insert" ON care_plans FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin', 'practitioner'));
CREATE POLICY "care_plans_update" ON care_plans FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()))
  WITH CHECK (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin', 'practitioner'));

-- Care plan versions
CREATE POLICY "care_plan_versions_select" ON care_plan_versions FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM care_plans cp
      WHERE cp.id = care_plan_versions.care_plan_id
        AND (
          public.tenant_role(cp.tenant_id) = 'tenant_admin'
          OR EXISTS (
            SELECT 1 FROM coach_assignments ca
            WHERE ca.client_id = cp.client_id
              AND ca.practitioner_id = public.platform_user_id()
              AND ca.status = 'active'
          )
        )
    )
  );
CREATE POLICY "care_plan_versions_insert" ON care_plan_versions FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM care_plans cp
      WHERE cp.id = care_plan_versions.care_plan_id
        AND public.tenant_role(cp.tenant_id) IN ('tenant_admin', 'practitioner')
    )
  );
CREATE POLICY "care_plan_versions_update" ON care_plan_versions FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Wellness programs
CREATE POLICY "programs_select" ON wellness_programs FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "programs_insert" ON wellness_programs FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin'));
CREATE POLICY "programs_update" ON wellness_programs FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin'))
  WITH CHECK (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin'));

-- Wellness enrollments
CREATE POLICY "enrollments_select" ON wellness_enrollments FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "enrollments_insert" ON wellness_enrollments FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin', 'staff'));
CREATE POLICY "enrollments_update" ON wellness_enrollments FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()))
  WITH CHECK (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));

-- Invoices
CREATE POLICY "invoices_select" ON invoices FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "invoices_insert" ON invoices FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin', 'staff'));
CREATE POLICY "invoices_update" ON invoices FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin'))
  WITH CHECK (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin'));

-- Food items (global, read-only for non-super_admin)
CREATE POLICY "food_items_select" ON food_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "food_items_insert" ON food_items FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY "food_items_update" ON food_items FOR UPDATE TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Recipes (global or tenant-scoped)
CREATE POLICY "recipes_select" ON recipes FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "recipes_insert" ON recipes FOR INSERT TO authenticated
  WITH CHECK (
    (tenant_id IS NULL AND public.is_super_admin())
    OR (tenant_id IS NOT NULL AND tenant_id IN (SELECT public.active_tenant_ids()))
  );
CREATE POLICY "recipes_update" ON recipes FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR (tenant_id IS NOT NULL AND tenant_id IN (SELECT public.active_tenant_ids())))
  WITH CHECK (public.is_super_admin() OR (tenant_id IS NOT NULL AND tenant_id IN (SELECT public.active_tenant_ids())));

-- Recipe ingredients (inherits through recipe)
CREATE POLICY "recipe_ingredients_select" ON recipe_ingredients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r WHERE r.id = recipe_ingredients.recipe_id
        AND (r.tenant_id IS NULL OR public.is_super_admin() OR r.tenant_id IN (SELECT public.active_tenant_ids()))
    )
  );
CREATE POLICY "recipe_ingredients_insert" ON recipe_ingredients FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes r WHERE r.id = recipe_ingredients.recipe_id
        AND (r.tenant_id IS NULL AND public.is_super_admin()
             OR r.tenant_id IS NOT NULL AND r.tenant_id IN (SELECT public.active_tenant_ids()))
    )
  );
CREATE POLICY "recipe_ingredients_delete" ON recipe_ingredients FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r WHERE r.id = recipe_ingredients.recipe_id
        AND (public.is_super_admin() OR r.tenant_id IN (SELECT public.active_tenant_ids()))
    )
  );

-- Meal plans
CREATE POLICY "meal_plans_select" ON meal_plans FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "meal_plans_insert" ON meal_plans FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin', 'practitioner'));
CREATE POLICY "meal_plans_update" ON meal_plans FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()))
  WITH CHECK (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));

-- Meal plan items
CREATE POLICY "meal_plan_items_select" ON meal_plan_items FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM meal_plans mp WHERE mp.id = meal_plan_items.meal_plan_id
      AND (public.is_super_admin() OR mp.tenant_id IN (SELECT public.active_tenant_ids())))
  );
CREATE POLICY "meal_plan_items_insert" ON meal_plan_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM meal_plans mp WHERE mp.id = meal_plan_items.meal_plan_id
      AND (public.is_super_admin() OR mp.tenant_id IN (SELECT public.active_tenant_ids())))
  );
CREATE POLICY "meal_plan_items_delete" ON meal_plan_items FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM meal_plans mp WHERE mp.id = meal_plan_items.meal_plan_id
      AND (public.is_super_admin() OR mp.tenant_id IN (SELECT public.active_tenant_ids())))
  );

-- Nutrition entries (food diary) — client can also see own
CREATE POLICY "nutrition_entries_select" ON nutrition_entries FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "nutrition_entries_insert" ON nutrition_entries FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "nutrition_entries_delete" ON nutrition_entries FOR DELETE TO authenticated
  USING (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin', 'practitioner'));

-- ============================================================
-- AUDIT TRIGGERS
-- ============================================================

CREATE TRIGGER audit_contacts
  AFTER INSERT OR UPDATE OR DELETE ON contacts
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_wellness_clients
  AFTER INSERT OR UPDATE OR DELETE ON wellness_clients
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_appointments
  AFTER INSERT OR UPDATE OR DELETE ON appointments
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_health_assessments
  AFTER INSERT OR UPDATE OR DELETE ON health_assessments
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_health_measurements
  AFTER INSERT OR UPDATE OR DELETE ON health_measurements
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_care_plans
  AFTER INSERT OR UPDATE OR DELETE ON care_plans
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_wellness_enrollments
  AFTER INSERT OR UPDATE OR DELETE ON wellness_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
