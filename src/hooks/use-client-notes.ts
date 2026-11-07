import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ClientNote, NoteType } from "@/types";

export function useClientNotes(clientId: string) {
  return useQuery({
    queryKey: ["client-notes", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_notes")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ClientNote[];
    },
    enabled: !!clientId,
  });
}

export function useAddClientNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tenant_id: string;
      client_id: string;
      written_by: string;
      content: string;
      note_type?: NoteType;
      appointment_id?: string;
      is_private?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("client_notes")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as ClientNote;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["client-notes", data.client_id] });
    },
  });
}

export function useDeleteClientNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from("client_notes").delete().eq("id", noteId);
      if (error) throw error;
      return noteId;
    },
    onSuccess: (_id, _vars, context) => {
      qc.invalidateQueries({ queryKey: ["client-notes"] });
      void context;
    },
  });
}
