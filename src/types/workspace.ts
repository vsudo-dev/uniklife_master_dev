export type NoteType = "session" | "progress" | "general" | "alert" | "follow_up";

export interface ClientNote {
  id: string;
  tenant_id: string;
  client_id: string;
  appointment_id: string | null;
  written_by: string;
  note_type: NoteType;
  content: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceAppointment {
  id: string;
  tenant_id: string;
  contact_id: string;
  service_id: string;
  staff_user_id: string;
  branch_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  check_in_at: string | null;
  notes: string | null;
  contacts: {
    first_name: string;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  services: {
    name: string;
    duration_minutes: number;
  } | null;
}
